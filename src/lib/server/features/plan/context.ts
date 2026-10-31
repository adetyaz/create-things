/** Shared lookups for planning: the user's timezone and which roadmap steps they own. */
import { and, asc, eq, inArray, isNull, lt, type SQL } from 'drizzle-orm';
import type { Db } from '$lib/server/db';
import { items, planSlots, roadmaps, roadmapSteps, userSettings } from '$lib/server/db/schema';

export async function timezoneOf(db: Db, userId: string): Promise<string> {
	const [row] = await db
		.select({ timezone: userSettings.timezone })
		.from(userSettings)
		.where(eq(userSettings.userId, userId));
	return row?.timezone ?? 'UTC';
}

/** The user's blocks matching `where`, with their step and item, in day and rank order. */
export function slotsWithSteps(db: Db, userId: string, where?: SQL) {
	return db
		.select({ slot: planSlots, step: roadmapSteps, itemId: items.id, itemTitle: items.title })
		.from(planSlots)
		.innerJoin(roadmapSteps, eq(roadmapSteps.id, planSlots.stepId))
		.innerJoin(roadmaps, eq(roadmaps.id, roadmapSteps.roadmapId))
		.innerJoin(items, eq(items.id, roadmaps.itemId))
		.where(and(eq(planSlots.userId, userId), where))
		.orderBy(asc(planSlots.day), asc(planSlots.position));
}

/**
 * Marks blocks missed once their day has passed with the step not done. Run whenever the plan is
 * read, so no background job is needed.
 */
export function markMissed(db: Db, userId: string, today: string) {
	return db
		.update(planSlots)
		.set({ missedAt: new Date() })
		.where(
			and(
				eq(planSlots.userId, userId),
				lt(planSlots.day, today),
				isNull(planSlots.missedAt),
				inArray(
					planSlots.stepId,
					db.select({ id: roadmapSteps.id }).from(roadmapSteps).where(isNull(roadmapSteps.doneAt))
				)
			)
		);
}

/** The given steps that belong to the user, with their item. */
export function ownedSteps(db: Db, userId: string, stepIds: string[]) {
	return db
		.select({ step: roadmapSteps, itemId: items.id, itemTitle: items.title })
		.from(roadmapSteps)
		.innerJoin(roadmaps, eq(roadmaps.id, roadmapSteps.roadmapId))
		.innerJoin(items, eq(items.id, roadmaps.itemId))
		.where(and(inArray(roadmapSteps.id, stepIds), eq(items.userId, userId)));
}
