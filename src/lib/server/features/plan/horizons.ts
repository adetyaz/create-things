/**
 * Longer horizons: year, half-year and quarter plans (and any period added to the registry with
 * `generic: true`). Each picks 1–3 goals from the period above it; the year adds themes and who
 * they want to become; quarter goals get a target date at the quarter's end.
 */
import { and, eq, gt, inArray, isNull, lte, or } from 'drizzle-orm';
import { withDb, type Db } from '$lib/server/db';
import { items, planPeriods } from '$lib/server/db/schema';
import { remember } from '$lib/server/features/memory/service';
import { timezoneOf } from './context';
import { addDays, today } from './dates';
import type { HorizonInput } from './input';
import { PLAN_PERIODS, periodOf, type PeriodId, type PlanPeriod } from './periods';

type Platform = App.Platform | undefined;

export interface GoalItem {
	id: string;
	title: string;
	status: string;
	targetDate: string | null;
}

export interface HorizonView {
	kind: PeriodId;
	label: string;
	name: string;
	startsOn: string;
	endsOn: string;
	/** False until the user plans this period; the app offers it then. */
	planned: boolean;
	goals: GoalItem[];
	themes: string[];
	intention: string | null;
	/** Questions about the period that just ended, and its name. */
	review: { of: string; questions: string[] };
	/** What goals can be picked from: the period above's goals, or everything waiting. */
	shortlist: GoalItem[];
	maxGoals: number;
}

const goalFields = {
	id: items.id,
	title: items.title,
	status: items.status,
	targetDate: items.targetDate
};
const ACTIVE = ['shortlist', 'ready', 'paused', 'focus'] as const;

/** The goals of the user's current `kind` period, or null if that period isn't planned. */
export async function currentGoals(
	db: Db,
	userId: string,
	kind: PeriodId,
	day: string
): Promise<GoalItem[] | null> {
	const { startsOn } = periodOf(kind, day);
	const [row] = await db
		.select({ goalItemIds: planPeriods.goalItemIds })
		.from(planPeriods)
		.where(
			and(
				eq(planPeriods.userId, userId),
				eq(planPeriods.kind, kind),
				eq(planPeriods.startsOn, startsOn)
			)
		);
	if (!row?.goalItemIds?.length) return null;
	const rows = await db
		.select(goalFields)
		.from(items)
		.where(
			and(
				eq(items.userId, userId),
				inArray(items.id, row.goalItemIds),
				inArray(items.status, [...ACTIVE])
			)
		);
	return row.goalItemIds.flatMap((id) => rows.filter((r) => r.id === id));
}

export async function getHorizon(
	platform: Platform,
	userId: string,
	kind: PeriodId
): Promise<HorizonView> {
	return withDb(platform, async (db) => {
		const day = today(await timezoneOf(db, userId));
		return horizonView(db, userId, kind, day);
	});
}

async function horizonView(db: Db, userId: string, kind: PeriodId, day: string) {
	const period: PlanPeriod = PLAN_PERIODS[kind];
	const { startsOn, endsOn, name } = periodOf(kind, day);
	const [row] = await db
		.select()
		.from(planPeriods)
		.where(
			and(
				eq(planPeriods.userId, userId),
				eq(planPeriods.kind, kind),
				eq(planPeriods.startsOn, startsOn)
			)
		);
	const goals = (await currentGoals(db, userId, kind, day)) ?? [];
	const fromParent = period.parent
		? await currentGoals(db, userId, period.parent as PeriodId, day)
		: null;
	const shortlist =
		fromParent ??
		(await db
			.select(goalFields)
			.from(items)
			.where(
				and(
					eq(items.userId, userId),
					inArray(items.status, [...ACTIVE]),
					or(isNull(items.parkedUntil), lte(items.parkedUntil, day))
				)
			)
			.limit(50));
	return {
		kind,
		label: period.label,
		name,
		startsOn,
		endsOn,
		planned: Boolean(row),
		goals,
		themes: row?.themes ?? [],
		intention: row?.intention ?? null,
		review: { of: period.name(addDays(startsOn, -1)), questions: period.reviewQuestions },
		shortlist,
		maxGoals: period.maxGoals
	};
}

export type PlanHorizonResult =
	| { status: 'planned'; horizon: HorizonView }
	| { status: 'invalid'; reason: string };

/** Saves this period's goals (replacing an earlier pick), themes and review. */
export async function planHorizon(
	platform: Platform,
	userId: string,
	kind: PeriodId,
	input: HorizonInput
): Promise<PlanHorizonResult> {
	const period: PlanPeriod = PLAN_PERIODS[kind];
	if (input.goalItemIds.length > period.maxGoals) {
		return {
			status: 'invalid',
			reason: `A ${period.label.toLowerCase()} has at most ${period.maxGoals} goals`
		};
	}
	if (!period.themes && (input.themes?.length || input.intention)) {
		return {
			status: 'invalid',
			reason: `Themes are for the year, not the ${period.label.toLowerCase()}`
		};
	}

	const saved = await withDb(platform, async (db) => {
		const day = today(await timezoneOf(db, userId));
		const { startsOn, endsOn, name } = periodOf(kind, day);
		const goals = input.goalItemIds.length
			? await db
					.select(goalFields)
					.from(items)
					.where(
						and(
							eq(items.userId, userId),
							inArray(items.id, input.goalItemIds),
							inArray(items.status, [...ACTIVE])
						)
					)
			: [];
		if (goals.length !== input.goalItemIds.length) return null;

		await db.transaction(async (tx) => {
			await tx
				.delete(planPeriods)
				.where(
					and(
						eq(planPeriods.userId, userId),
						eq(planPeriods.kind, kind),
						eq(planPeriods.startsOn, startsOn)
					)
				);
			await tx.insert(planPeriods).values({
				userId,
				kind,
				startsOn,
				goalItemIds: input.goalItemIds,
				themes: input.themes ?? null,
				intention: input.intention ?? null,
				review: input.review ?? null
			});
			// Quarter goals are due when the quarter ends (short enough to feel urgent).
			if (kind === 'quarter' && input.goalItemIds.length) {
				await tx
					.update(items)
					.set({ targetDate: endsOn })
					.where(
						and(
							inArray(items.id, input.goalItemIds),
							or(isNull(items.targetDate), gt(items.targetDate, endsOn))
						)
					);
			}
		});
		const titles = input.goalItemIds.map((id) => goals.find((g) => g.id === id)?.title);
		return { day, name, startsOn, titles };
	});
	if (!saved) return { status: 'invalid', reason: 'Goals must be your active items' };

	const lines = [
		input.review && {
			type: 'lesson_learned' as const,
			summary: `Looking back on ${period.name(addDays(saved.startsOn, -1))}: ${input.review.slice(0, 300)}`
		},
		{
			type: 'plan_change' as const,
			summary: [
				`${period.label} plan for ${saved.name}:`,
				input.themes?.length ? `themes ${input.themes.join('; ')}.` : '',
				input.intention ? `Becoming: ${input.intention}.` : '',
				saved.titles.length ? `Goals: ${saved.titles.join('; ')}.` : ''
			]
				.filter(Boolean)
				.join(' ')
		}
	].filter((m) => !!m);
	for (const memory of lines) {
		await remember(platform, userId, memory).catch((e) =>
			console.error('[plan] remember failed', e)
		);
	}

	return { status: 'planned', horizon: await getHorizon(platform, userId, kind) };
}
