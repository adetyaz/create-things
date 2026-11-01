/**
 * Knowledge cards: flashcards from recall questions, spaced review, practice quizzes and the
 * library (Breakdown §9). Review is free; a quiz costs 2 credits.
 */
import { and, asc, eq, inArray, lte } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items, knowledgeCards, userSettings } from '$lib/server/db/schema';
import { generateJson } from '$lib/server/ai';
import { withCredits } from '$lib/server/features/credits/service';
import { remember } from '$lib/server/features/memory/service';
import { getRoadmap } from '$lib/server/features/roadmap/service';
import { interleave, nextInterval, type Rating } from './schedule';
import {
	QUIZ_SYSTEM,
	quizPrompt,
	readQuiz,
	shuffleOptions,
	type QuizQuestion
} from './quiz-prompt';

type Platform = App.Platform | undefined;
type Card = typeof knowledgeCards.$inferSelect;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's due cards, mixed across items, up to the user's daily cap (default 5). */
export async function dueCards(platform: Platform, userId: string) {
	return withDb(platform, async (db) => {
		const [settings] = await db
			.select({ cap: userSettings.dailyReviewCap })
			.from(userSettings)
			.where(eq(userSettings.userId, userId));
		const due = await db
			.select({ card: knowledgeCards, itemTitle: items.title })
			.from(knowledgeCards)
			.leftJoin(items, eq(items.id, knowledgeCards.itemId))
			.where(and(eq(knowledgeCards.userId, userId), lte(knowledgeCards.nextReviewAt, new Date())))
			.orderBy(asc(knowledgeCards.nextReviewAt))
			.limit(60);
		const cards = due.map((d) => ({ ...d.card, itemTitle: d.itemTitle }));
		return { cards: interleave(cards, settings?.cap ?? 5), dueTotal: cards.length };
	});
}

export async function rateCard(
	platform: Platform,
	userId: string,
	cardId: string,
	rating: Rating
): Promise<Card | null> {
	const [card] = await withDb(platform, async (db) => {
		const [current] = await db
			.select()
			.from(knowledgeCards)
			.where(and(eq(knowledgeCards.id, cardId), eq(knowledgeCards.userId, userId)));
		if (!current) return [];
		const days = nextInterval(current.intervalDays, rating);
		return db
			.update(knowledgeCards)
			.set({
				intervalDays: days,
				nextReviewAt: new Date(Date.now() + days * DAY_MS),
				lastRating: rating,
				reviewCount: current.reviewCount + 1
			})
			.where(eq(knowledgeCards.id, cardId))
			.returning();
	});
	return card ?? null;
}

/** The knowledge library: every card, grouped by item. */
export async function library(platform: Platform, userId: string) {
	const rows = await withDb(platform, (db) =>
		db
			.select({ card: knowledgeCards, itemTitle: items.title })
			.from(knowledgeCards)
			.leftJoin(items, eq(items.id, knowledgeCards.itemId))
			.where(eq(knowledgeCards.userId, userId))
			.orderBy(asc(knowledgeCards.createdAt))
	);
	const groups = new Map<string, Card[]>();
	for (const r of rows) {
		const key = r.itemTitle ?? 'Other';
		groups.set(key, [...(groups.get(key) ?? []), r.card]);
	}
	return [...groups].map(([item, cards]) => ({ item, cards }));
}

export type QuizResult =
	| { status: 'ready'; itemTitle: string; milestone: string; questions: QuizQuestion[] }
	| { status: 'not_found' }
	| { status: 'nothing_to_quiz' };

/** A practice quiz for a milestone (default: the last finished one, else the current one). */
export async function makeQuiz(
	platform: Platform,
	userId: string,
	itemId: string,
	milestone?: string
): Promise<QuizResult> {
	const view = await getRoadmap(platform, userId, itemId);
	if (!view) return { status: 'not_found' };
	const [item] = await withDb(platform, (db) =>
		db.select({ title: items.title }).from(items).where(eq(items.id, itemId))
	);
	const target =
		view.milestones.find((m) => m.title === milestone) ??
		[...view.milestones].reverse().find((m) => m.done) ??
		view.milestones.find((m) => m.steps.some((s) => s.id === view.currentStep?.id));
	if (!target) return { status: 'nothing_to_quiz' };
	const index = view.milestones.indexOf(target);
	const earlier = view.milestones
		.slice(0, index)
		.flatMap((m) => m.steps)
		.filter((s) => s.recall)
		.slice(-4)
		.map((s) => ({ question: s.recall!, answer: s.recallAnswer }));

	const questions = await withCredits(
		platform,
		userId,
		'quiz',
		async () => {
			const result = await generateJson(platform, {
				system: QUIZ_SYSTEM,
				prompt: quizPrompt({
					itemTitle: item.title,
					milestone: target.title,
					steps: target.steps.map((s) => ({
						title: s.title,
						recall: s.recall,
						recallAnswer: s.recallAnswer
					})),
					earlier
				}),
				maxTokens: 3000
			});
			const questions = readQuiz(result.data).map((q) => shuffleOptions(q));
			// Thrown inside withCredits, so an unusable quiz is refunded.
			if (questions.length < 3) throw new Error('The model returned too few usable questions');
			return questions;
		},
		{ ref: `quiz:${itemId}` }
	);
	return { status: 'ready', itemTitle: item.title, milestone: target.title, questions };
}

/** Wrong answers become flashcards (due tomorrow) and one `review_weakness` memory. */
export async function recordQuiz(
	platform: Platform,
	userId: string,
	itemId: string,
	input: {
		total: number;
		wrong: { question: string; answer: string; explanation: string; topic: string }[];
	}
): Promise<{ cards: number } | null> {
	const [item] = await withDb(platform, (db) =>
		db
			.select({ title: items.title })
			.from(items)
			.where(and(eq(items.id, itemId), eq(items.userId, userId)))
	);
	if (!item) return null;
	if (input.wrong.length) {
		await withDb(platform, (db) =>
			db.insert(knowledgeCards).values(
				input.wrong.map((w) => ({
					userId,
					itemId,
					sourceType: 'quiz' as const,
					type: 'qa' as const,
					prompt: w.question,
					answer: `${w.answer}. ${w.explanation}`.slice(0, 1000),
					nextReviewAt: new Date(Date.now() + DAY_MS)
				}))
			)
		);
		const topics = [...new Set(input.wrong.map((w) => w.topic))].slice(0, 5);
		await remember(platform, userId, {
			type: 'review_weakness',
			summary: `Practice quiz on "${item.title}": missed ${input.wrong.length} of ${input.total}, on ${topics.join(', ')}.`,
			sourceType: 'item',
			sourceId: itemId
		}).catch((e) => console.error('[cards] remember failed', e));
	}
	return { cards: input.wrong.length };
}

/** A finished step's recall question becomes a flashcard, due tomorrow (once per step). */
export async function cardFromStep(
	platform: Platform,
	userId: string,
	itemId: string,
	step: { id: string; recall: string | null; recallAnswer: string | null }
): Promise<void> {
	if (!step.recall) return;
	await withDb(platform, async (db) => {
		const [exists] = await db
			.select({ id: knowledgeCards.id })
			.from(knowledgeCards)
			.where(inArray(knowledgeCards.sourceId, [step.id]));
		if (exists) return;
		await db.insert(knowledgeCards).values({
			userId,
			itemId,
			sourceType: 'roadmap_step',
			sourceId: step.id,
			// Older steps have no answer: the card asks them to explain it back instead.
			type: step.recallAnswer ? 'qa' : 'explain',
			prompt: step.recall!,
			answer: step.recallAnswer ?? 'Explain it in your own words, then check it against the step.',
			nextReviewAt: new Date(Date.now() + DAY_MS)
		});
	});
}
