/**
 * The roadmap job: plans milestones and 15–30 minute steps for one item (generate), or rewrites the
 * milestones still ahead once one is finished (replan). Both read the user's memories first, so the
 * plan skips what they know and supports what tripped them up. Runs from the queue in production
 * and inline under `npm run dev`.
 */
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { analyses, items, roadmaps, roadmapSteps } from '$lib/server/db/schema';
import { generateJson } from '$lib/server/ai';
import { OutOfCreditsError, withCredits } from '$lib/server/features/credits/service';
import { remember } from '$lib/server/features/memory/service';
import { recallMemories } from '$lib/server/features/memory/recall';
import { intentOf } from '$lib/server/features/intents/registry';
import { unitsOf } from '$lib/server/features/courses/service';
import { alignToUnits, normalizeRoadmap, type PlannedMilestone } from './normalize';
import { ROADMAP_SYSTEM, replanPrompt, roadmapPrompt } from './prompt';

type Platform = App.Platform | undefined;
type Step = typeof roadmapSteps.$inferSelect;

/** Goal options, 3–5 milestones and proving grounds run well past an analysis-sized reply. */
const ROADMAP_MAX_TOKENS = 6000;

/** Queue message for `createthings-roadmap`. */
export interface RoadmapJob {
	itemId: string;
	mode: 'generate' | 'replan';
	/** A goal the user chose: kept exactly instead of the model's first option. */
	goal?: string;
}

export type RoadmapOutcome =
	| { status: 'done'; itemId: string; mode: RoadmapJob['mode']; model: string; steps: number }
	| { status: 'skipped'; itemId: string; reason: string };

/**
 * Runs the job. A failure is saved on the item (so GET /api/items/[id]/roadmap shows it) and
 * rethrown so the queue retries; each new attempt clears it first.
 */
export async function runRoadmapJob(platform: Platform, job: RoadmapJob): Promise<RoadmapOutcome> {
	// A new attempt starts clean, so an old failure doesn't show while this one runs.
	await setPlanError(platform, job.itemId, null);
	try {
		const outcome =
			job.mode === 'replan'
				? await replan(platform, job.itemId)
				: await generate(platform, job.itemId, job.goal);
		return outcome;
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		await setPlanError(platform, job.itemId, `${job.mode}: ${message}`);
		// Not thrown, so the queue doesn't retry: it would fail the same way until credits return.
		if (e instanceof OutOfCreditsError) {
			return { status: 'skipped', itemId: job.itemId, reason: 'out of credits' };
		}
		throw e;
	}
}

function setPlanError(platform: Platform, itemId: string, error: string | null) {
	return withDb(platform, (db) =>
		db
			.update(items)
			.set({ planError: error?.slice(0, 2000) ?? null })
			.where(eq(items.id, itemId))
	).catch((e) => console.error('[roadmap] could not save the plan error', e));
}

async function generate(
	platform: Platform,
	itemId: string,
	chosenGoal?: string
): Promise<RoadmapOutcome> {
	const found = await withDb(platform, async (db) => {
		const [item] = await db.select().from(items).where(eq(items.id, itemId));
		if (!item) return null;
		const [analysis] = await db
			.select()
			.from(analyses)
			.where(eq(analyses.itemId, itemId))
			.orderBy(desc(analyses.createdAt))
			.limit(1);
		return { item, analysis };
	});
	if (!found) return { status: 'skipped', itemId, reason: 'item not found' };
	const { item, analysis } = found;

	const memories = await recallMemories(
		item.userId,
		`Plan for "${item.title}": what I already know, what tripped me up, how I like to work`
	);
	const fallbackStyle = intentOf(item.intent).roadmapStyle;
	const courseUnits = await unitsOf(platform, item.id);

	const { plan, model } = await withCredits(
		platform,
		item.userId,
		'roadmap',
		async () => {
			const result = await generateJson(platform, {
				system: ROADMAP_SYSTEM,
				maxTokens: ROADMAP_MAX_TOKENS,
				prompt: roadmapPrompt({
					title: item.title,
					intent: item.intent,
					practiceKind: item.practiceKind,
					goal: chosenGoal ?? item.goal,
					goalChosen: Boolean(chosenGoal),
					targetDate: item.targetDate,
					courseUnits,
					summary: analysis?.summary ?? item.note,
					brief: analysis?.brief ?? null,
					skills: analysis?.skills ?? [],
					size: item.size,
					difficulty: item.difficulty,
					memories
				})
			});
			const raw = normalizeRoadmap(result.data, fallbackStyle);
			const plan = courseUnits.length
				? {
						...raw,
						milestones: alignToUnits(
							raw.milestones,
							courseUnits.map((u) => u.title)
						)
					}
				: raw;
			// Thrown inside withCredits, so an unusable answer is refunded and retried.
			if (plan.milestones.length === 0) throw new Error('The model returned no usable milestones');
			return { plan, model: result.model };
		},
		{ ref: `roadmap:${item.id}` }
	);

	const goal = chosenGoal ?? plan.goalOptions[0] ?? item.goal;
	const goalOptions = [
		...new Set([...(chosenGoal ? [chosenGoal] : []), ...plan.goalOptions])
	].slice(0, 3);

	// One roadmap per item: a new one replaces the old (its steps go with it).
	await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			await tx.delete(roadmaps).where(eq(roadmaps.itemId, item.id));
			const [roadmap] = await tx
				.insert(roadmaps)
				.values({
					itemId: item.id,
					style: plan.style,
					goal,
					goalOptions,
					skills: plan.skills,
					resources: plan.resources
				})
				.returning({ id: roadmaps.id });
			await tx.insert(roadmapSteps).values(stepRows(roadmap.id, plan.milestones, 0));
		})
	);

	await remember(platform, item.userId, {
		type: 'plan',
		summary: `Plan for "${shortTitle(item.title)}"${goal ? ` (goal: ${goal})` : ''}: ${plan.milestones.map((m) => m.title).join(' → ')}. First step: ${plan.milestones[0].steps[0].title}.`,
		sourceType: 'item',
		sourceId: item.id
	}).catch((e) => console.error('[roadmap] remember failed for', item.id, e));

	return {
		status: 'done',
		itemId: item.id,
		mode: 'generate',
		model,
		steps: countSteps(plan.milestones)
	};
}

async function replan(platform: Platform, itemId: string): Promise<RoadmapOutcome> {
	const found = await withDb(platform, async (db) => {
		const [item] = await db.select().from(items).where(eq(items.id, itemId));
		const [roadmap] = await db
			.select()
			.from(roadmaps)
			.where(eq(roadmaps.itemId, itemId))
			.orderBy(desc(roadmaps.createdAt))
			.limit(1);
		if (!item || !roadmap) return null;
		const steps = await db
			.select()
			.from(roadmapSteps)
			.where(eq(roadmapSteps.roadmapId, roadmap.id))
			.orderBy(asc(roadmapSteps.position));
		return { item, roadmap, steps };
	});
	if (!found) return { status: 'skipped', itemId, reason: 'no roadmap' };
	const { item, roadmap, steps } = found;

	const ahead = milestonesAhead(steps);
	if (ahead.length === 0) return { status: 'skipped', itemId, reason: 'nothing left to re-plan' };
	const done = steps.filter((s) => s.doneAt);
	const isCourse = (await unitsOf(platform, item.id)).length > 0;

	const memories = await recallMemories(
		item.userId,
		`Progress on "${item.title}": what was easy, what was hard, what I learned`
	);

	const { milestones, model } = await withCredits(
		platform,
		item.userId,
		'replan',
		async () => {
			const result = await generateJson(platform, {
				system: ROADMAP_SYSTEM,
				maxTokens: ROADMAP_MAX_TOKENS,
				prompt: replanPrompt({
					title: item.title,
					intent: item.intent,
					practiceKind: item.practiceKind,
					goal: roadmap.goal,
					isCourse,
					done: done.map((s) => ({ milestone: s.milestone, title: s.title })),
					remainingMilestones: ahead,
					memories
				})
			});
			const planned = normalizeRoadmap(result.data, roadmap.style).milestones;
			// A course's units ahead keep their names and order.
			const milestones = isCourse ? alignToUnits(planned, ahead) : planned;
			if (milestones.length === 0) throw new Error('The model returned no usable milestones');
			return { milestones, model: result.model };
		},
		{ ref: `replan:${roadmap.id}` }
	);

	// Swap only the untouched milestones; finished and started work stays as it was.
	const replaced = steps.filter((s) => ahead.includes(s.milestone)).map((s) => s.id);
	const start =
		Math.max(-1, ...steps.filter((s) => !ahead.includes(s.milestone)).map((s) => s.position)) + 1;
	await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			await tx.delete(roadmapSteps).where(inArray(roadmapSteps.id, replaced));
			await tx.insert(roadmapSteps).values(stepRows(roadmap.id, milestones, start));
		})
	);

	await remember(platform, item.userId, {
		type: 'plan_change',
		summary: `Re-planned "${shortTitle(item.title)}" after ${done.length} finished steps. Next now: ${milestones
			.flatMap((m) => m.steps)
			.slice(0, 3)
			.map((s) => s.title)
			.join('; ')}.`,
		sourceType: 'item',
		sourceId: item.id
	}).catch((e) => console.error('[roadmap] remember failed for', item.id, e));

	return { status: 'done', itemId: item.id, mode: 'replan', model, steps: countSteps(milestones) };
}

/**
 * Milestones after the last one with any finished step, where nothing is finished yet. Those are
 * the ones a re-plan may rewrite. In roadmap order.
 */
export function milestonesAhead(
	steps: Pick<Step, 'milestone' | 'position' | 'doneAt'>[]
): string[] {
	const ordered = [...steps].sort((a, b) => a.position - b.position);
	const lastDone = ordered.findLastIndex((s) => s.doneAt);
	const later = ordered.slice(lastDone + 1);
	const touched = new Set(ordered.slice(0, lastDone + 1).map((s) => s.milestone));
	return [...new Set(later.map((s) => s.milestone))].filter((m) => !touched.has(m));
}

function stepRows(roadmapId: string, milestones: PlannedMilestone[], start: number) {
	let position = start;
	return milestones.flatMap((m) =>
		m.steps.map((s) => ({
			roadmapId,
			milestone: m.title,
			position: position++,
			title: s.title,
			minutes: s.minutes,
			twoMinute: s.twoMinute,
			searchTerms: s.searchTerms,
			tools: s.tools,
			recall: s.recall,
			kind: s.kind
		}))
	);
}

/** Page titles can be long ("GitHub - owner/repo: a long description"); memories keep the name. */
function shortTitle(title: string): string {
	const name = title.split(/: | \| | — /)[0].trim();
	return name.length > 80 ? `${name.slice(0, 77)}...` : name;
}

function countSteps(milestones: PlannedMilestone[]): number {
	return milestones.reduce((n, m) => n + m.steps.length, 0);
}
