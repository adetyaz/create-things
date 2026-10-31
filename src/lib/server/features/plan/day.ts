/**
 * Day: the Ivy Lee method. Tomorrow's top 3 are ranked the night before; Today shows only the
 * first unfinished one.
 */
import { and, asc, eq, inArray, notInArray } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items, planSlots, roadmaps, roadmapSteps } from '$lib/server/db/schema';
import { ownedSteps, timezoneOf } from './context';
import { addDays, today } from './dates';
import { intention } from './fill';

type Platform = App.Platform | undefined;

export interface DayBlock {
	slotId: string;
	position: number;
	startTime: string | null;
	anchor: string | null;
	place: string | null;
	missed: boolean;
	intention: string;
	step: {
		id: string;
		title: string;
		minutes: number;
		twoMinute: string | null;
		recall: string | null;
		done: boolean;
	};
	item: { id: string; title: string };
}

export interface DayView {
	day: string;
	blocks: DayBlock[];
	/** What Today shows: the first block not done or missed. Null when the day is clear. */
	first: DayBlock | null;
}

/** A day's blocks in rank order. `day` defaults to today in the user's timezone. */
export async function getDay(platform: Platform, userId: string, day?: string): Promise<DayView> {
	return withDb(platform, async (db) => {
		const date = day ?? today(await timezoneOf(db, userId));
		const rows = await db
			.select({ slot: planSlots, step: roadmapSteps, itemId: items.id, itemTitle: items.title })
			.from(planSlots)
			.innerJoin(roadmapSteps, eq(roadmapSteps.id, planSlots.stepId))
			.innerJoin(roadmaps, eq(roadmaps.id, roadmapSteps.roadmapId))
			.innerJoin(items, eq(items.id, roadmaps.itemId))
			.where(and(eq(planSlots.userId, userId), eq(planSlots.day, date)))
			.orderBy(asc(planSlots.position));
		const blocks: DayBlock[] = rows.map(({ slot, step, itemId, itemTitle }) => ({
			slotId: slot.id,
			position: slot.position,
			startTime: slot.startTime?.slice(0, 5) ?? null,
			anchor: slot.anchor,
			place: slot.place,
			missed: Boolean(slot.missedAt),
			intention: intention(slot, step.title),
			step: {
				id: step.id,
				title: step.title,
				minutes: step.minutes,
				twoMinute: step.twoMinute,
				recall: step.recall,
				done: Boolean(step.doneAt)
			},
			item: { id: itemId, title: itemTitle }
		}));
		return { day: date, blocks, first: blocks.find((b) => !b.step.done && !b.missed) ?? null };
	});
}

export type RankResult = { status: 'ranked'; tomorrow: DayView } | { status: 'invalid' };

/**
 * Puts these steps on tomorrow as #1–#3, in order. A step planned for another day moves to
 * tomorrow (keeping its time, anchor and place); tomorrow's other blocks follow after them.
 */
export async function rankTomorrow(
	platform: Platform,
	userId: string,
	stepIds: string[]
): Promise<RankResult> {
	const tomorrow = await withDb(platform, async (db) => {
		const owned = await ownedSteps(db, userId, stepIds);
		if (owned.length !== stepIds.length || owned.some((o) => o.step.doneAt)) return null;
		const date = addDays(today(await timezoneOf(db, userId)), 1);

		await db.transaction(async (tx) => {
			const existing = await tx
				.select({ id: planSlots.id, stepId: planSlots.stepId })
				.from(planSlots)
				.where(inArray(planSlots.stepId, stepIds));
			for (const [i, stepId] of stepIds.entries()) {
				const slot = existing.find((s) => s.stepId === stepId);
				if (slot) {
					await tx
						.update(planSlots)
						.set({ day: date, position: i + 1, missedAt: null })
						.where(eq(planSlots.id, slot.id));
				} else {
					await tx.insert(planSlots).values({ userId, stepId, day: date, position: i + 1 });
				}
			}
			const others = await tx
				.select({ id: planSlots.id })
				.from(planSlots)
				.where(
					and(
						eq(planSlots.userId, userId),
						eq(planSlots.day, date),
						notInArray(planSlots.stepId, stepIds)
					)
				)
				.orderBy(asc(planSlots.position));
			for (const [i, other] of others.entries()) {
				await tx
					.update(planSlots)
					.set({ position: stepIds.length + i + 1 })
					.where(eq(planSlots.id, other.id));
			}
		});
		return date;
	});
	if (!tomorrow) return { status: 'invalid' };
	return { status: 'ranked', tomorrow: await getDay(platform, userId, tomorrow) };
}
