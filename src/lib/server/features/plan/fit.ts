/**
 * Fit-it-in: a new idea arrives mid-plan. Walrus `embed` finds the goal it belongs to, and the pet
 * offers ways to fit it in without killing the vibe: add it as a step, swap a block, park it, or a
 * 5-minute note. Nothing changes until the user picks one. Free: no AI call.
 */
import {
	and,
	asc,
	desc,
	eq,
	gt,
	gte,
	inArray,
	isNull,
	lte,
	notInArray,
	or,
	sql
} from 'drizzle-orm';
import { withDb, type Db } from '$lib/server/db';
import {
	analyses,
	items,
	planPeriods,
	planSlots,
	roadmaps,
	roadmapSteps
} from '$lib/server/db/schema';
import { embedItems } from '$lib/server/features/memory/embed';
import { remember } from '$lib/server/features/memory/service';
import { slotsWithSteps, timezoneOf } from './context';
import { addDays, monthStart, today, weekStart, weekdayName } from './dates';
import type { ApplyFitInput } from './input';
import { cosine, daysLabel, MIN_SIMILARITY, parkDay } from './rules';

type Platform = App.Platform | undefined;
type Choice = ApplyFitInput['choice'];

export interface FitOffer {
	choice: Choice;
	/** What the pet says. */
	label: string;
	relatedItemId?: string;
	day?: string;
	parkUntil?: string;
}

export interface FitProposal {
	item: { id: string; title: string };
	/** The goal the idea belongs to, when one is close enough in meaning. */
	related: { id: string; title: string; score: number } | null;
	/** Every Focus item and month goal, closest first, so the user can choose another. */
	candidates: { id: string; title: string; score: number | null }[];
	offers: FitOffer[];
}

export async function proposeFit(
	platform: Platform,
	userId: string,
	itemId: string
): Promise<FitProposal | null> {
	const found = await withDb(platform, async (db) => {
		const [item] = await db
			.select({ id: items.id, title: items.title, note: items.note })
			.from(items)
			.where(and(eq(items.id, itemId), eq(items.userId, userId)));
		if (!item) return null;
		const now = today(await timezoneOf(db, userId));
		const goals = await goalsOf(db, userId, now, itemId);
		const summaries = await db
			.select({ itemId: analyses.itemId, summary: analyses.summary })
			.from(analyses)
			.where(inArray(analyses.itemId, [itemId, ...goals.map((g) => g.id)]));
		const summaryOf = new Map(summaries.map((s) => [s.itemId, s.summary]));
		return { item, now, goals, summaryOf };
	});
	if (!found) return null;
	const { item, now, goals, summaryOf } = found;

	const describe = (id: string, title: string, note?: string | null) =>
		[title, summaryOf.get(id) ?? note ?? ''].join('. ');
	// Cached per item, so only new or changed text is embedded (cost rule 4).
	const vectors = goals.length
		? await embedItems(platform, userId, [
				{ id: item.id, text: describe(item.id, item.title, item.note) },
				...goals.map((g) => ({ id: g.id, text: describe(g.id, g.title) }))
			])
		: null;
	const idea = vectors?.get(item.id);
	const candidates = goals
		.map((g) => {
			const goal = vectors?.get(g.id);
			return {
				id: g.id,
				title: g.title,
				score: idea && goal ? Math.round(cosine(idea, goal) * 100) / 100 : null
			};
		})
		.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
	const best = candidates[0];
	const related =
		best && best.score !== null && best.score >= MIN_SIMILARITY
			? { id: best.id, title: best.title, score: best.score }
			: null;

	const plan = related ? await planOf(platform, userId, related.id, now) : null;
	const offers: FitOffer[] = [];
	if (related && plan?.hasRoadmap) {
		offers.push({
			choice: 'add_step',
			label: `This is about ${related.title}. Add it as a step there?`,
			relatedItemId: related.id
		});
	}
	if (related && plan && plan.days.length > 0) {
		const lastDay = [...plan.days].sort().at(-1)!;
		offers.push({
			choice: 'swap',
			label: `You set ${daysLabel(plan.days)} for ${related.title}. ${new Set(plan.days).size > 1 ? `Swap ${weekdayName(lastDay)}` : 'Give that block to this'}?`,
			relatedItemId: related.id,
			day: lastDay
		});
	}
	const until = parkDay(plan?.days ?? [], now);
	offers.push({
		choice: 'park',
		label: `Park it until ${weekdayName(until)}${until >= addDays(weekStart(now), 7) ? ' next week' : ''}?`,
		parkUntil: until
	});
	offers.push({
		choice: 'note',
		label: `Write it down for 5 minutes now, then back to ${plan?.currentStep ?? related?.title ?? 'your plan'}.`
	});

	return { item: { id: item.id, title: item.title }, related, candidates, offers };
}

/** Focus items and this month's goals: the things a new idea could belong to. */
async function goalsOf(db: Db, userId: string, now: string, exclude: string) {
	const [month] = await db
		.select({ goalItemIds: planPeriods.goalItemIds })
		.from(planPeriods)
		.where(
			and(
				eq(planPeriods.userId, userId),
				eq(planPeriods.kind, 'month'),
				eq(planPeriods.startsOn, monthStart(now))
			)
		);
	const goalIds = month?.goalItemIds ?? [];
	return db
		.select({ id: items.id, title: items.title })
		.from(items)
		.where(
			and(
				eq(items.userId, userId),
				notInArray(items.id, [exclude]),
				goalIds.length
					? or(eq(items.status, 'focus'), inArray(items.id, goalIds))
					: eq(items.status, 'focus')
			)
		);
}

/** The related item's roadmap, current step and the days it's planned on this week. */
async function planOf(platform: Platform, userId: string, itemId: string, now: string) {
	return withDb(platform, async (db) => {
		const [roadmap] = await db
			.select({ id: roadmaps.id })
			.from(roadmaps)
			.where(eq(roadmaps.itemId, itemId))
			.orderBy(desc(roadmaps.createdAt))
			.limit(1);
		if (!roadmap)
			return { hasRoadmap: false, currentStep: null, days: [] as string[], lastSlot: null };
		const [current] = await db
			.select({ title: roadmapSteps.title })
			.from(roadmapSteps)
			.where(and(eq(roadmapSteps.roadmapId, roadmap.id), isNull(roadmapSteps.doneAt)))
			.orderBy(asc(roadmapSteps.position))
			.limit(1);
		const slots = (
			await slotsWithSteps(
				db,
				userId,
				and(
					gte(planSlots.day, now),
					lte(planSlots.day, addDays(weekStart(now), 6)),
					isNull(planSlots.missedAt)
				)
			)
		).filter((s) => s.itemId === itemId && !s.step.doneAt);
		return {
			hasRoadmap: true,
			currentStep: current?.title ?? null,
			days: slots.map((s) => s.slot.day),
			lastSlot: slots.at(-1)?.slot ?? null
		};
	});
}

export type ApplyFitResult =
	| { status: 'applied'; choice: Choice; stepId?: string; day?: string; parkUntil?: string }
	| { status: 'invalid'; reason: string };

export async function applyFit(
	platform: Platform,
	userId: string,
	input: ApplyFitInput
): Promise<ApplyFitResult> {
	const found = await withDb(platform, async (db) => {
		const ids = [input.itemId, ...(input.relatedItemId ? [input.relatedItemId] : [])];
		const rows = await db
			.select({ id: items.id, title: items.title })
			.from(items)
			.where(and(eq(items.userId, userId), inArray(items.id, ids)));
		return {
			now: today(await timezoneOf(db, userId)),
			item: rows.find((r) => r.id === input.itemId),
			related: rows.find((r) => r.id === input.relatedItemId)
		};
	});
	if (!found.item) return { status: 'invalid', reason: 'No item with that id' };
	const { now, item, related } = found;

	if (input.choice === 'note') {
		await note(
			platform,
			userId,
			item.id,
			'idea_parked',
			`Wrote down "${item.title}" for later and went back to the plan.`
		);
		return { status: 'applied', choice: 'note' };
	}

	if (input.choice === 'park') {
		const plan = related ? await planOf(platform, userId, related.id, now) : null;
		const until = input.parkUntil ?? parkDay(plan?.days ?? [], now);
		await withDb(platform, (db) =>
			db.update(items).set({ parkedUntil: until }).where(eq(items.id, item.id))
		);
		await note(
			platform,
			userId,
			item.id,
			'idea_parked',
			`Parked "${item.title}" until ${weekdayName(until)} ${until}${related ? ` to stay on "${related.title}"` : ''}.`
		);
		return { status: 'applied', choice: 'park', parkUntil: until };
	}

	if (!related) return { status: 'invalid', reason: 'Adding or swapping needs relatedItemId' };
	const plan = await planOf(platform, userId, related.id, now);
	if (!plan.hasRoadmap)
		return { status: 'invalid', reason: `"${related.title}" has no roadmap yet` };
	if (input.choice === 'swap' && !plan.lastSlot) {
		return { status: 'invalid', reason: `"${related.title}" has no block left this week to swap` };
	}

	const stepId = await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			const [roadmap] = await tx
				.select({ id: roadmaps.id })
				.from(roadmaps)
				.where(eq(roadmaps.itemId, related.id))
				.orderBy(desc(roadmaps.createdAt))
				.limit(1);
			const steps = await tx
				.select()
				.from(roadmapSteps)
				.where(eq(roadmapSteps.roadmapId, roadmap.id))
				.orderBy(asc(roadmapSteps.position));
			// Right after the current step, so it comes up next without jumping the queue.
			const current = steps.find((s) => !s.doneAt) ?? steps.at(-1)!;
			await tx
				.update(roadmapSteps)
				.set({ position: sql`${roadmapSteps.position} + 1` })
				.where(
					and(eq(roadmapSteps.roadmapId, roadmap.id), gt(roadmapSteps.position, current.position))
				);
			const [step] = await tx
				.insert(roadmapSteps)
				.values({
					roadmapId: roadmap.id,
					milestone: current.milestone,
					position: current.position + 1,
					title: `Fit in: ${item.title}`,
					minutes: 25,
					twoMinute: 'Open the saved idea and write one sentence on how it fits'
				})
				.returning({ id: roadmapSteps.id });
			if (input.choice === 'swap') {
				// The idea takes the block; the step that was there goes back to unplanned.
				await tx
					.update(planSlots)
					.set({ stepId: step.id })
					.where(eq(planSlots.id, plan.lastSlot!.id));
			}
			// The idea now lives in the related roadmap.
			await tx.update(items).set({ status: 'archived' }).where(eq(items.id, item.id));
			return step.id;
		})
	);

	const where =
		input.choice === 'swap' ? ` and took ${weekdayName(plan.lastSlot!.day)}'s block` : '';
	await note(
		platform,
		userId,
		item.id,
		'idea_merged',
		`Added "${item.title}" to "${related.title}" as a step${where}.`
	);
	return {
		status: 'applied',
		choice: input.choice,
		stepId,
		day: input.choice === 'swap' ? plan.lastSlot!.day : undefined
	};
}

async function note(
	platform: Platform,
	userId: string,
	itemId: string,
	type: 'idea_parked' | 'idea_merged',
	summary: string
) {
	await remember(platform, userId, { type, summary, sourceType: 'item', sourceId: itemId }).catch(
		(e) => console.error('[plan] remember failed', e)
	);
}
