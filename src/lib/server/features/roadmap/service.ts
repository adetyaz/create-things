/**
 * Roadmaps as navigation: milestones of small steps, always with a current step. Finishing a
 * milestone re-plans the rest from what the user did and what the pet remembers.
 */
import { and, asc, desc, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items, projects, roadmaps, roadmapSteps } from '$lib/server/db/schema';
import { enqueue, type EnqueueResult } from '$lib/server/jobs';
import { milestonesAhead } from './job';

type Platform = App.Platform | undefined;
type Step = typeof roadmapSteps.$inferSelect;

export interface Milestone {
	title: string;
	done: boolean;
	steps: Step[];
}

export interface RoadmapView {
	roadmap: typeof roadmaps.$inferSelect;
	milestones: Milestone[];
	/** The first unfinished step: what to do next. Null when everything is done. */
	currentStep: Step | null;
	doneSteps: number;
	totalSteps: number;
}

/** The item's roadmap, grouped into milestones in order. Null if there isn't one (yet). */
export async function getRoadmap(
	platform: Platform,
	userId: string,
	itemId: string
): Promise<RoadmapView | null> {
	return withDb(platform, async (db) => {
		const [roadmap] = await db
			.select({ roadmap: roadmaps })
			.from(roadmaps)
			.innerJoin(items, eq(items.id, roadmaps.itemId))
			.where(and(eq(roadmaps.itemId, itemId), eq(items.userId, userId)))
			.orderBy(desc(roadmaps.createdAt))
			.limit(1);
		if (!roadmap) return null;
		const steps = await db
			.select()
			.from(roadmapSteps)
			.where(eq(roadmapSteps.roadmapId, roadmap.roadmap.id))
			.orderBy(asc(roadmapSteps.position));
		return view(roadmap.roadmap, steps);
	});
}

function view(roadmap: typeof roadmaps.$inferSelect, steps: Step[]): RoadmapView {
	const milestones: Milestone[] = [];
	for (const step of steps) {
		const last = milestones.at(-1);
		if (last?.title === step.milestone) last.steps.push(step);
		else milestones.push({ title: step.milestone, done: false, steps: [step] });
	}
	for (const m of milestones) m.done = m.steps.every((s) => s.doneAt);
	return {
		roadmap,
		milestones,
		currentStep: steps.find((s) => !s.doneAt) ?? null,
		doneSteps: steps.filter((s) => s.doneAt).length,
		totalSteps: steps.length
	};
}

/** Queues a fresh roadmap for one of the user's items (replacing any existing one). */
export async function requestRoadmap(
	platform: Platform,
	userId: string,
	itemId: string
): Promise<EnqueueResult | null> {
	const [item] = await withDb(platform, (db) =>
		db
			.select({ id: items.id })
			.from(items)
			.where(and(eq(items.id, itemId), eq(items.userId, userId)))
	);
	if (!item) return null;
	return enqueue(platform, 'roadmap', { itemId, mode: 'generate' });
}

/**
 * Called when an item is started: makes its project (once) and queues its roadmap if it has none
 * (unless told not to, while the confirm card is waiting).
 * Failures are logged, never thrown, so starting always works.
 */
export async function startPlanning(
	platform: Platform,
	userId: string,
	item: { id: string; title: string },
	/** False until the user confirms what the item is (the confirm card plans it then). */
	options: { roadmap?: boolean } = {}
): Promise<void> {
	try {
		const hasRoadmap = await withDb(platform, async (db) => {
			const [project] = await db
				.select({ id: projects.id })
				.from(projects)
				.where(eq(projects.itemId, item.id))
				.limit(1);
			if (!project) {
				await db.insert(projects).values({ userId, itemId: item.id, title: item.title });
			}
			const [roadmap] = await db
				.select({ id: roadmaps.id })
				.from(roadmaps)
				.where(eq(roadmaps.itemId, item.id))
				.limit(1);
			return Boolean(roadmap);
		});
		if (!hasRoadmap && options.roadmap !== false) {
			await enqueue(platform, 'roadmap', { itemId: item.id, mode: 'generate' });
		}
	} catch (e) {
		console.error('[roadmap] start planning failed for', item.id, e);
	}
}

export type CompleteResult =
	| { status: 'done'; roadmap: RoadmapView; milestoneDone: boolean; replanning: boolean }
	| { status: 'not_found' };

/**
 * Marks a step done (again is fine), updates progress, and re-plans the milestones ahead when this
 * finished a milestone.
 */
export async function completeStep(
	platform: Platform,
	userId: string,
	stepId: string
): Promise<CompleteResult> {
	const result = await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			const [found] = await tx
				.select({ step: roadmapSteps, roadmap: roadmaps, itemId: items.id })
				.from(roadmapSteps)
				.innerJoin(roadmaps, eq(roadmaps.id, roadmapSteps.roadmapId))
				.innerJoin(items, eq(items.id, roadmaps.itemId))
				.where(and(eq(roadmapSteps.id, stepId), eq(items.userId, userId)));
			if (!found) return null;

			const wasDone = Boolean(found.step.doneAt);
			if (!wasDone) {
				await tx
					.update(roadmapSteps)
					.set({ doneAt: new Date() })
					.where(eq(roadmapSteps.id, stepId));
			}
			const steps = await tx
				.select()
				.from(roadmapSteps)
				.where(eq(roadmapSteps.roadmapId, found.roadmap.id))
				.orderBy(asc(roadmapSteps.position));
			const progress = steps.every((s) => s.doneAt) ? 'complete' : 'in_progress';
			const [roadmap] = await tx
				.update(roadmaps)
				.set({ progress })
				.where(eq(roadmaps.id, found.roadmap.id))
				.returning();
			await tx.update(items).set({ lastActiveAt: new Date() }).where(eq(items.id, found.itemId));

			const milestoneDone = steps
				.filter((s) => s.milestone === found.step.milestone)
				.every((s) => s.doneAt);
			// Only the step that finishes a milestone triggers a re-plan, not a repeat tap.
			const replan = !wasDone && milestoneDone && milestonesAhead(steps).length > 0;
			return { itemId: found.itemId, view: view(roadmap, steps), milestoneDone, replan };
		})
	);
	if (!result) return { status: 'not_found' };

	if (result.replan) {
		await enqueue(platform, 'roadmap', { itemId: result.itemId, mode: 'replan' }).catch((e) =>
			console.error('[roadmap] replan enqueue failed', e)
		);
	}
	return {
		status: 'done',
		roadmap: result.view,
		milestoneDone: result.milestoneDone,
		replanning: result.replan
	};
}

export type SetGoalResult =
	| { status: 'replanning'; mode: 'generate' | 'replan'; goal: string; delivery: EnqueueResult }
	| { status: 'not_found' };

/**
 * Sets the roadmap's goal (a suggested one or the user's own) and re-plans toward it: a fresh
 * roadmap if nothing is done yet, otherwise the milestones still ahead.
 */
export async function setGoal(
	platform: Platform,
	userId: string,
	itemId: string,
	goal: string
): Promise<SetGoalResult> {
	const current = await getRoadmap(platform, userId, itemId);
	if (!current) return { status: 'not_found' };
	await withDb(platform, (db) =>
		db.update(roadmaps).set({ goal }).where(eq(roadmaps.id, current.roadmap.id))
	);
	const mode = current.doneSteps === 0 ? 'generate' : 'replan';
	const delivery = await enqueue(platform, 'roadmap', { itemId, mode, goal });
	return { status: 'replanning', mode, goal, delivery };
}

/** Why the item's last planning job failed, or null. */
export async function planErrorOf(
	platform: Platform,
	userId: string,
	itemId: string
): Promise<string | null> {
	const [row] = await withDb(platform, (db) =>
		db
			.select({ planError: items.planError })
			.from(items)
			.where(and(eq(items.id, itemId), eq(items.userId, userId)))
	);
	return row?.planError ?? null;
}
