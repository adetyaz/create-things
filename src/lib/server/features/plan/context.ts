/** Shared lookups for planning: the user's timezone and which roadmap steps they own. */
import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '$lib/server/db';
import { items, roadmaps, roadmapSteps, userSettings } from '$lib/server/db/schema';

export async function timezoneOf(db: Db, userId: string): Promise<string> {
	const [row] = await db
		.select({ timezone: userSettings.timezone })
		.from(userSettings)
		.where(eq(userSettings.userId, userId));
	return row?.timezone ?? 'UTC';
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
