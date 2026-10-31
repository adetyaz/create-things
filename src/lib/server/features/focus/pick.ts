/**
 * Pick for me: one Shortlist item for the time and energy available, informed by what the pet
 * remembers, with the memories it relied on returned as citations.
 */
import { and, count, desc, eq, inArray, isNull, lte, notInArray, or, sql } from 'drizzle-orm';
import { generateJson } from '$lib/server/ai';
import { withDb } from '$lib/server/db';
import { analyses, items } from '$lib/server/db/schema';
import { withCredits } from '$lib/server/features/credits/service';
import { intentOf } from '$lib/server/features/intents/registry';
import { recallMemories, type RecalledMemory } from '$lib/server/features/memory/recall';
import { heuristicPick, type Candidate } from './heuristic';
import type { PickInput } from './input';
import { PICK_SYSTEM, pickPrompt, readPick } from './prompt';

type Platform = App.Platform | undefined;

export interface PickResult {
	item: { id: string; title: string; size: string | null; difficulty: string | null } | null;
	reason: string;
	firstStep: string | null;
	twoMinuteStart: string | null;
	/** The memories the pick relied on, shown to the user as citations. */
	memoriesUsed: RecalledMemory[];
	/** The model that picked, or "rule" when the no-AI fallback did. */
	pickedBy: string;
}

const MAX_CANDIDATES = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function pickForMe(
	platform: Platform,
	userId: string,
	input: PickInput
): Promise<PickResult> {
	const shortlist = await withDb(platform, (db) =>
		db
			.select()
			.from(items)
			.where(
				and(
					eq(items.userId, userId),
					eq(items.status, 'shortlist'),
					// Not-this-month and parked items stay out until their day comes.
					or(isNull(items.parkedUntil), lte(items.parkedUntil, sql`current_date`)),
					input.exclude.length ? notInArray(items.id, input.exclude) : undefined
				)
			)
			.orderBy(desc(items.savedAt))
			.limit(MAX_CANDIDATES)
	);
	if (shortlist.length === 0) return emptyPick(platform, userId, input.exclude.length > 0);

	const summaries = await withDb(platform, (db) =>
		db
			.select({ itemId: analyses.itemId, summary: analyses.summary })
			.from(analyses)
			.where(
				inArray(
					analyses.itemId,
					shortlist.map((i) => i.id)
				)
			)
	);
	const summaryOf = new Map(summaries.map((s) => [s.itemId, s.summary]));
	const memories = await recallMemories(
		userId,
		`What should I work on with ${input.minutes} minutes and ${input.energy} energy? My goals, plans and how I work.`
	);
	const now = Date.now();

	try {
		const { model, pick } = await withCredits(
			platform,
			userId,
			'pick',
			async () => {
				const result = await generateJson(platform, {
					system: PICK_SYSTEM,
					prompt: pickPrompt({
						minutes: input.minutes,
						energy: input.energy,
						memories,
						candidates: shortlist.map((i) => ({
							id: i.id,
							title: i.title,
							summary: summaryOf.get(i.id) ?? null,
							size: i.size,
							difficulty: i.difficulty,
							intent: intentOf(i.intent).label,
							daysWaiting: Math.floor((now - i.savedAt.getTime()) / DAY_MS)
						}))
					})
				});
				const pick = readPick(
					result.data,
					shortlist.map((i) => i.id),
					memories.length
				);
				// Thrown inside withCredits, so an unusable answer is refunded.
				if (!pick) throw new Error('The model picked something that is not on the shortlist');
				return { model: result.model, pick };
			},
			{ ref: 'pick' }
		);

		const item = shortlist.find((i) => i.id === pick.itemId)!;
		return {
			item: summarise(item),
			reason: pick.reason,
			firstStep: pick.firstStep || null,
			twoMinuteStart: pick.twoMinuteStart || null,
			memoriesUsed: pick.memoriesUsed.map((n) => memories[n - 1]),
			pickedBy: model
		};
	} catch (e) {
		console.warn('[pick] falling back to the rule:', e instanceof Error ? e.message : e);
		return rulePick(shortlist, input, now);
	}
}

function rulePick(
	shortlist: (typeof items.$inferSelect)[],
	input: PickInput,
	now: number
): PickResult {
	const candidates: Candidate[] = shortlist.map((i) => ({
		id: i.id,
		title: i.title,
		size: i.size,
		difficulty: i.difficulty,
		savedAt: i.savedAt
	}));
	const choice = heuristicPick(candidates, input.minutes, input.energy)!;
	const item = shortlist.find((i) => i.id === choice.id)!;
	const days = Math.floor((now - item.savedAt.getTime()) / DAY_MS);
	return {
		item: summarise(item),
		reason: `This fits ${input.minutes} minutes and ${input.energy} energy best${days > 1 ? `, and it's been waiting ${days} days` : ''}.`,
		firstStep: null,
		twoMinuteStart: null,
		memoriesUsed: [],
		pickedBy: 'rule'
	};
}

async function emptyPick(
	platform: Platform,
	userId: string,
	excluded: boolean
): Promise<PickResult> {
	const [{ ready }] = await withDb(platform, (db) =>
		db
			.select({ ready: count() })
			.from(items)
			.where(and(eq(items.userId, userId), eq(items.status, 'ready')))
	);
	const reason = excluded
		? "That's everything on your shortlist for today. Sort a few new things, or come back tomorrow."
		: ready > 0
			? `Your shortlist is empty. You have ${ready} analysed item${ready === 1 ? '' : 's'} to sort first: keep the ones you want.`
			: 'Nothing to pick yet. Save a few things you want to make or learn first.';
	return {
		item: null,
		reason,
		firstStep: null,
		twoMinuteStart: null,
		memoriesUsed: [],
		pickedBy: 'none'
	};
}

function summarise(item: typeof items.$inferSelect): NonNullable<PickResult['item']> {
	return { id: item.id, title: item.title, size: item.size, difficulty: item.difficulty };
}
