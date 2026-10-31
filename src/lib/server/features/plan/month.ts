/**
 * Month: two lists (the Buffett story James Clear tells). The user picks 1–3 goals; everything else
 * waiting is parked until next month, never deleted. Starts with a short, skippable review.
 */
import { and, eq, gt, inArray, notInArray } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items, planPeriods } from '$lib/server/db/schema';
import { remember } from '$lib/server/features/memory/service';
import { timezoneOf } from './context';
import { addDays, monthName, monthStart, nextMonthStart, today } from './dates';
import type { PlanMonthInput } from './input';

type Platform = App.Platform | undefined;

export interface MonthItem {
	id: string;
	title: string;
	status: string;
}

export interface MonthView {
	month: string;
	name: string;
	/** False until the user picks this month's goals; the app offers the month plan then. */
	planned: boolean;
	goals: MonthItem[];
	notThisMonth: MonthItem[];
}

/** Items that can be a month goal. */
const GOAL_STATUSES = ['shortlist', 'ready', 'paused', 'focus'] as const;
/** Items that get parked when they aren't picked. Focus work in progress is left alone. */
const PARKABLE = ['shortlist', 'ready', 'paused'] as const;

const brief = { id: items.id, title: items.title, status: items.status };

export async function getMonth(platform: Platform, userId: string): Promise<MonthView> {
	return withDb(platform, async (db) => {
		const day = today(await timezoneOf(db, userId));
		const [period] = await db
			.select()
			.from(planPeriods)
			.where(
				and(
					eq(planPeriods.userId, userId),
					eq(planPeriods.kind, 'month'),
					eq(planPeriods.startsOn, monthStart(day))
				)
			);
		const goalIds = period?.goalItemIds ?? [];
		const goals = goalIds.length
			? await db
					.select(brief)
					.from(items)
					.where(and(eq(items.userId, userId), inArray(items.id, goalIds)))
			: [];
		const notThisMonth = await db
			.select(brief)
			.from(items)
			.where(and(eq(items.userId, userId), gt(items.parkedUntil, day)));
		return {
			month: monthStart(day),
			name: monthName(day),
			planned: Boolean(period),
			// In the order the user picked them.
			goals: goalIds.flatMap((id) => goals.filter((g) => g.id === id)),
			notThisMonth
		};
	});
}

export type PlanMonthResult =
	| { status: 'planned'; month: MonthView; parked: number }
	| { status: 'invalid' };

/** Saves this month's goals (replacing any earlier pick this month) and parks everything else. */
export async function planMonth(
	platform: Platform,
	userId: string,
	input: PlanMonthInput
): Promise<PlanMonthResult> {
	const saved = await withDb(platform, async (db) => {
		const day = today(await timezoneOf(db, userId));
		const goals = await db
			.select(brief)
			.from(items)
			.where(
				and(
					eq(items.userId, userId),
					inArray(items.id, input.goalItemIds),
					inArray(items.status, [...GOAL_STATUSES])
				)
			);
		if (goals.length !== input.goalItemIds.length) return null;

		const parked = await db.transaction(async (tx) => {
			await tx
				.delete(planPeriods)
				.where(
					and(
						eq(planPeriods.userId, userId),
						eq(planPeriods.kind, 'month'),
						eq(planPeriods.startsOn, monthStart(day))
					)
				);
			await tx.insert(planPeriods).values({
				userId,
				kind: 'month',
				startsOn: monthStart(day),
				goalItemIds: input.goalItemIds,
				review: input.review || null
			});
			await tx.update(items).set({ parkedUntil: null }).where(inArray(items.id, input.goalItemIds));
			const rows = await tx
				.update(items)
				.set({ parkedUntil: nextMonthStart(day) })
				.where(
					and(
						eq(items.userId, userId),
						inArray(items.status, [...PARKABLE]),
						notInArray(items.id, input.goalItemIds)
					)
				)
				.returning({ id: items.id });
			return rows.length;
		});
		return { day, goals, parked };
	});
	if (!saved) return { status: 'invalid' };

	const { day, goals, parked } = saved;
	const titles = input.goalItemIds.map((id) => goals.find((g) => g.id === id)?.title).join('; ');
	const memories = [
		input.review && {
			type: 'lesson_learned' as const,
			summary: `Looking back on ${monthName(addDays(monthStart(day), -1))}: ${input.review.slice(0, 300)}`
		},
		{
			type: 'plan_change' as const,
			summary: `Goals for ${monthName(day)}: ${titles}. Parked ${parked} other things until next month.`
		}
	].filter((m) => !!m);
	for (const memory of memories) {
		await remember(platform, userId, memory).catch((e) =>
			console.error('[plan] remember failed', e)
		);
	}

	return { status: 'planned', month: await getMonth(platform, userId), parked };
}

/** Brings an item back from the not-this-month list. */
export async function unpark(
	platform: Platform,
	userId: string,
	itemId: string
): Promise<MonthItem | null> {
	const [item] = await withDb(platform, (db) =>
		db
			.update(items)
			.set({ parkedUntil: null })
			.where(and(eq(items.id, itemId), eq(items.userId, userId)))
			.returning(brief)
	);
	return item ?? null;
}
