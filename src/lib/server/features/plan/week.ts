/**
 * Week: the user says how many blocks they have and when; the pet fills them with the next roadmap
 * steps from the month's goals (or Focus, before a month is planned). Nothing is saved until the
 * user OKs the adjusted week. Filling is free: no AI call.
 */
import { and, asc, desc, eq, gte, inArray, isNull, notInArray } from 'drizzle-orm';
import { withDb, type Db } from '$lib/server/db';
import { items, planPeriods, planSlots, roadmaps, roadmapSteps } from '$lib/server/db/schema';
import { remember } from '$lib/server/features/memory/service';
import { ownedSteps, timezoneOf } from './context';
import { monthStart, today, weekStart, weekdayName } from './dates';
import {
	byTime,
	fillBlocks,
	intention,
	type BlockRequest,
	type FilledBlock,
	type StepOption
} from './fill';
import type { SaveWeekInput } from './input';

type Platform = App.Platform | undefined;

export interface WeekProposal {
	weekOf: string;
	blocks: FilledBlock[];
	/** Goals with no roadmap yet: start them (or POST their roadmap) so they can fill blocks. */
	needsRoadmap: { id: string; title: string }[];
}

export async function proposeWeek(
	platform: Platform,
	userId: string,
	blocks: BlockRequest[]
): Promise<WeekProposal> {
	return withDb(platform, async (db) => {
		const day = today(await timezoneOf(db, userId));
		const requestedDays = [...new Set(blocks.map((b) => b.day))];
		const goals = await weekGoals(db, userId, day);

		const queues: StepOption[][] = [];
		const needsRoadmap: WeekProposal['needsRoadmap'] = [];
		for (const goal of goals) {
			const [roadmap] = await db
				.select({ id: roadmaps.id })
				.from(roadmaps)
				.where(eq(roadmaps.itemId, goal.id))
				.orderBy(desc(roadmaps.createdAt))
				.limit(1);
			if (!roadmap) {
				needsRoadmap.push(goal);
				continue;
			}
			// Steps already planned on other upcoming days stay where they are.
			const plannedElsewhere = db
				.select({ stepId: planSlots.stepId })
				.from(planSlots)
				.where(
					and(
						eq(planSlots.userId, userId),
						gte(planSlots.day, day),
						isNull(planSlots.missedAt),
						notInArray(planSlots.day, requestedDays)
					)
				);
			const steps = await db
				.select()
				.from(roadmapSteps)
				.where(
					and(
						eq(roadmapSteps.roadmapId, roadmap.id),
						isNull(roadmapSteps.doneAt),
						notInArray(roadmapSteps.id, plannedElsewhere)
					)
				)
				.orderBy(asc(roadmapSteps.position));
			queues.push(
				steps.map((s) => ({
					id: s.id,
					title: s.title,
					minutes: s.minutes,
					twoMinute: s.twoMinute,
					itemId: goal.id,
					itemTitle: goal.title
				}))
			);
		}

		const firstDay = [...requestedDays].sort()[0];
		return { weekOf: weekStart(firstDay), blocks: fillBlocks(blocks, queues), needsRoadmap };
	});
}

/** The month's goals once a month is planned, otherwise what's in Focus. */
async function weekGoals(db: Db, userId: string, day: string) {
	const [month] = await db
		.select({ goalItemIds: planPeriods.goalItemIds })
		.from(planPeriods)
		.where(
			and(
				eq(planPeriods.userId, userId),
				eq(planPeriods.kind, 'month'),
				eq(planPeriods.startsOn, monthStart(day))
			)
		);
	const goalIds = month?.goalItemIds ?? [];
	const rows = await db
		.select({ id: items.id, title: items.title })
		.from(items)
		.where(
			and(
				eq(items.userId, userId),
				goalIds.length
					? and(
							inArray(items.id, goalIds),
							inArray(items.status, ['shortlist', 'ready', 'paused', 'focus'])
						)
					: eq(items.status, 'focus')
			)
		);
	return goalIds.length ? goalIds.flatMap((id) => rows.filter((r) => r.id === id)) : rows;
}

export type SaveWeekResult =
	| { status: 'saved'; weekOf: string; blocks: number }
	| { status: 'invalid' };

/** Saves the adjusted week: those days are rewritten with these blocks, ranked by time. */
export async function saveWeek(
	platform: Platform,
	userId: string,
	input: SaveWeekInput
): Promise<SaveWeekResult> {
	const stepIds = input.blocks.map((b) => b.stepId);
	const saved = await withDb(platform, async (db) => {
		const owned = await ownedSteps(db, userId, stepIds);
		if (owned.length !== stepIds.length) return null;
		const titleOf = new Map(owned.map((o) => [o.step.id, o.step.title]));

		const days = [...new Set(input.blocks.map((b) => b.day))];
		const weekOf = weekStart([...days].sort()[0]);
		const ordered = [...input.blocks].sort(byTime);
		const positionIn = new Map<string, number>();

		await db.transaction(async (tx) => {
			await tx
				.delete(planSlots)
				.where(and(eq(planSlots.userId, userId), inArray(planSlots.day, days)));
			await tx.delete(planSlots).where(inArray(planSlots.stepId, stepIds));
			await tx.insert(planSlots).values(
				ordered.map((b) => {
					const position = (positionIn.get(b.day) ?? 0) + 1;
					positionIn.set(b.day, position);
					return {
						userId,
						stepId: b.stepId,
						day: b.day,
						startTime: b.startTime ?? null,
						anchor: b.anchor ?? null,
						place: b.place ?? null,
						position
					};
				})
			);
			await tx
				.delete(planPeriods)
				.where(
					and(
						eq(planPeriods.userId, userId),
						eq(planPeriods.kind, 'week'),
						eq(planPeriods.startsOn, weekOf)
					)
				);
			await tx
				.insert(planPeriods)
				.values({ userId, kind: 'week', startsOn: weekOf, blocksWanted: input.blocks.length });
		});
		const sorted = [...days].sort();
		return {
			weekOf,
			from: sorted[0],
			to: sorted.at(-1)!,
			intentions: ordered.map((b) => intention(b, titleOf.get(b.stepId)!))
		};
	});
	if (!saved) return { status: 'invalid' };

	await remember(platform, userId, {
		type: 'plan',
		summary: `Planned ${input.blocks.length} blocks from ${dayLabel(saved.from)} to ${dayLabel(saved.to)}. ${saved.intentions.slice(0, 3).join('; ')}.`
	}).catch((e) => console.error('[plan] remember failed', e));

	return { status: 'saved', weekOf: saved.weekOf, blocks: input.blocks.length };
}

/** "Sun 1 Nov". */
function dayLabel(day: string): string {
	const month = new Date(`${day}T00:00:00Z`).toLocaleString('en-GB', {
		month: 'short',
		timeZone: 'UTC'
	});
	return `${weekdayName(day)} ${Number(day.slice(8))} ${month}`;
}
