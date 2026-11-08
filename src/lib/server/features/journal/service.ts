/**
 * The journal: entries about anything (a Focus item, any goal, the day) and one-line check-ins.
 * Entries about a goal you're working on feed the pet, snack or meal by depth (design PRD C27).
 * Journal text stays here; the pet's memory only gets "Checked in on <goal>" in the daily digest.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import {
	items,
	journalEntries,
	knowledgeCards,
	roadmapSteps,
	roadmaps
} from '$lib/server/db/schema';
import { generateJson } from '$lib/server/ai';
import { withCredits } from '$lib/server/features/credits/service';
import { remember } from '$lib/server/features/memory/service';
import { feedQuietly, type FeedResult } from '$lib/server/features/pet/service';
import { recordEvent } from '$lib/server/features/experiments/service';
import { foodFor, matchItem, soundsLikeLearning, wordCount } from './rules';
import {
	ABOUT_SCHEMA,
	ABOUT_SYSTEM,
	aboutPrompt,
	CARDS_SCHEMA,
	CARDS_SYSTEM,
	cardsPrompt,
	readCards
} from './prompt';
import type { EntryInput } from './input';

type Platform = App.Platform | undefined;
export type Entry = typeof journalEntries.$inferSelect;

interface Goal {
	id: string;
	title: string;
	status: string;
	step: string | null;
}

/** Goals an entry could be about: Focus and Shortlist items, with their current step. */
async function openGoals(platform: Platform, userId: string): Promise<Goal[]> {
	return withDb(platform, (db) =>
		db
			.select({
				id: items.id,
				title: items.title,
				status: items.status,
				step: sql<string | null>`(
					select ${roadmapSteps.title} from ${roadmapSteps}
					join ${roadmaps} on ${roadmaps.id} = ${roadmapSteps.roadmapId}
					where ${roadmaps.itemId} = ${items.id} and ${roadmapSteps.doneAt} is null
					order by ${roadmapSteps.position} limit 1)`
			})
			.from(items)
			.where(and(eq(items.userId, userId), inArray(items.status, ['focus', 'shortlist'])))
	);
}

/** Only when the rules can't tell: a tiny, free (to the user) check of what an entry is about. */
async function aiAbout(platform: Platform, body: string, goals: Goal[]): Promise<Goal | null> {
	try {
		const { data } = await generateJson(platform, {
			system: ABOUT_SYSTEM,
			prompt: aboutPrompt(body, goals),
			schema: ABOUT_SCHEMA,
			maxTokens: 120
		});
		if (data.realWork !== true) return null;
		return goals.find((g) => g.id === data.itemId) ?? null;
	} catch (e) {
		console.error('[journal] about check failed', e);
		return null;
	}
}

export interface EntryResult {
	entry: Entry;
	/** What it's about, if anything. */
	about: { id: string; title: string } | null;
	/** What the pet got (null: not about Focus work, or no pet). */
	fed: FeedResult | null;
	/** It's about a Shortlist item: "Make this your focus?" */
	suggestFocus: boolean;
	/** Sounds like learning: offer "Turn this into flashcards?" (1 credit). */
	offerCards: boolean;
}

export async function addEntry(
	platform: Platform,
	userId: string,
	input: EntryInput
): Promise<EntryResult> {
	const goals = await openGoals(platform, userId);
	let about: Goal | null = null;
	let stepId = input.stepId ?? null;

	if (input.stepId) {
		// A step names its item.
		const [row] = await withDb(platform, (db) =>
			db
				.select({ itemId: roadmaps.itemId })
				.from(roadmapSteps)
				.innerJoin(roadmaps, eq(roadmaps.id, roadmapSteps.roadmapId))
				.innerJoin(items, eq(items.id, roadmaps.itemId))
				.where(and(eq(roadmapSteps.id, input.stepId!), eq(items.userId, userId)))
		);
		if (!row) stepId = null;
		about = goals.find((g) => g.id === row?.itemId) ?? null;
	}
	if (!about && input.itemId) about = goals.find((g) => g.id === input.itemId) ?? null;
	if (!about && !input.itemId && !input.aboutDay) {
		about = matchItem(input.body, goals);
		// The rules couldn't tell, and it's long enough to be about something: ask the small model.
		if (!about && goals.some((g) => g.status === 'focus') && wordCount(input.body) >= 8) {
			about = await aiAbout(
				platform,
				input.body,
				goals.filter((g) => g.status === 'focus')
			);
		}
	}
	// An item named by the user that isn't open still gets linked (no feeding).
	const itemId = about?.id ?? input.itemId ?? null;

	const [entry] = await withDb(platform, (db) =>
		db
			.insert(journalEntries)
			.values({
				userId,
				itemId,
				stepId,
				kind: input.kind,
				body: input.body,
				source: input.source ?? (input.kind === 'check_in' ? 'check_in' : 'manual')
			})
			.returning()
	);

	let fed: FeedResult | null = null;
	if (about?.status === 'focus') {
		const size = foodFor(input.kind, input.body);
		fed = await feedQuietly(platform, userId, { type: 'journal', id: entry.id }, size);
		if (fed?.status === 'fed') {
			await withDb(platform, (db) =>
				db.update(journalEntries).set({ fed: size }).where(eq(journalEntries.id, entry.id))
			);
			entry.fed = size;
		}
		await remember(platform, userId, {
			type: 'session_summary',
			summary: `${input.kind === 'check_in' ? 'Checked in' : 'Journaled'} on "${about.title}".`,
			sourceType: 'journal',
			sourceId: entry.id,
			delivery: 'digest'
		}).catch((e) => console.error('[journal] remember failed', e));
	}
	await recordEvent(platform, userId, input.kind === 'check_in' ? 'check_in' : 'journal');

	return {
		entry,
		about: about ? { id: about.id, title: about.title } : null,
		fed,
		suggestFocus: about?.status === 'shortlist',
		offerCards: soundsLikeLearning(input.body)
	};
}

/** Entries, newest first; optionally about one item. */
export function listEntries(
	platform: Platform,
	userId: string,
	options: { itemId?: string; limit?: number } = {}
): Promise<Entry[]> {
	return withDb(platform, (db) =>
		db
			.select()
			.from(journalEntries)
			.where(
				and(
					eq(journalEntries.userId, userId),
					options.itemId ? eq(journalEntries.itemId, options.itemId) : undefined
				)
			)
			.orderBy(desc(journalEntries.createdAt))
			.limit(Math.min(options.limit ?? 30, 100))
	);
}

async function entryOf(platform: Platform, userId: string, id: string) {
	const [row] = await withDb(platform, (db) =>
		db
			.select({ entry: journalEntries, itemTitle: items.title })
			.from(journalEntries)
			.leftJoin(items, eq(items.id, journalEntries.itemId))
			.where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
	);
	return row ?? null;
}

export type DraftResult =
	| { status: 'drafted'; cards: { prompt: string; answer: string }[] }
	| { status: 'not_found' };

/** Flashcard drafts from an entry (1 credit); nothing is saved until approved. */
export async function draftCards(
	platform: Platform,
	userId: string,
	entryId: string
): Promise<DraftResult> {
	const row = await entryOf(platform, userId, entryId);
	if (!row) return { status: 'not_found' };
	const cards = await withCredits(
		platform,
		userId,
		'cards',
		async () => {
			const { data } = await generateJson(platform, {
				system: CARDS_SYSTEM,
				prompt: cardsPrompt(row.entry.body, row.itemTitle),
				schema: CARDS_SCHEMA,
				maxTokens: 600
			});
			const cards = readCards(data);
			if (!cards.length) throw new Error('No usable flashcards came back');
			return cards;
		},
		{ ref: `cards:${entryId}` }
	);
	return { status: 'drafted', cards };
}

export type SaveCardsResult =
	| { status: 'saved'; cards: number; fed: FeedResult | null }
	| { status: 'not_found' };

/** Saves the approved cards (due tomorrow); making cards is a snack for the pet. */
export async function saveCards(
	platform: Platform,
	userId: string,
	entryId: string,
	cards: { prompt: string; answer: string }[]
): Promise<SaveCardsResult> {
	const row = await entryOf(platform, userId, entryId);
	if (!row) return { status: 'not_found' };
	const due = new Date(Date.now() + 24 * 60 * 60 * 1000);
	await withDb(platform, (db) =>
		db.insert(knowledgeCards).values(
			cards.map((c) => ({
				userId,
				itemId: row.entry.itemId,
				sourceType: 'journal' as const,
				sourceId: entryId,
				type: 'qa' as const,
				prompt: c.prompt,
				answer: c.answer,
				nextReviewAt: due
			}))
		)
	);
	const fed = await feedQuietly(platform, userId, { type: 'cards', id: entryId }, 'snack');
	return { status: 'saved', cards: cards.length, fed };
}
