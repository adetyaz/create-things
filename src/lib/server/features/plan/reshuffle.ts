/**
 * Reshuffle: plans bend, they don't break. Missed blocks are offered new slots (never moved
 * silently), never miss twice puts yesterday's step first as its 2-minute version, and a busy week
 * keeps what fits and moves the rest. Free: no AI call.
 */
import { and, asc, eq, gte, inArray, isNotNull, isNull, lte, max, or } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { planSlots } from '$lib/server/db/schema';
import { remember } from '$lib/server/features/memory/service';
import { markMissed, slotsWithSteps, timezoneOf } from './context';
import { addDays, today, weekStart, weekdayName } from './dates';
import { toBlock, type DayBlock } from './day';
import { fillBlocks, type BlockRequest, type FilledBlock } from './fill';
import type { MoveInput, ReshuffleInput, SaveWeekInput } from './input';
import { missedYesterday, suggestDays } from './rules';
import { slotRows } from './week';

type Platform = App.Platform | undefined;

/** Missed blocks older than this are no longer offered (their steps stay in the roadmap). */
const LOOKBACK_DAYS = 14;

export interface MissedBlock extends DayBlock {
	day: string;
	suggestion: BlockRequest;
}

export interface ReshuffleView {
	today: string;
	missed: MissedBlock[];
	/** After a missed day: yesterday's top step, offered as today's #1 with its 2-minute version. */
	neverMissTwice: {
		slotId: string;
		stepTitle: string;
		twoMinute: string | null;
		message: string;
	} | null;
}

export async function getReshuffle(platform: Platform, userId: string): Promise<ReshuffleView> {
	return withDb(platform, async (db) => {
		const now = today(await timezoneOf(db, userId));
		await markMissed(db, userId, now);

		const missedRows = await slotsWithSteps(
			db,
			userId,
			and(isNotNull(planSlots.missedAt), gte(planSlots.day, addDays(now, -LOOKBACK_DAYS)))
		);
		const missed = missedRows.filter((r) => !r.step.doneAt);
		const upcoming = await slotsWithSteps(
			db,
			userId,
			and(gte(planSlots.day, now), isNull(planSlots.missedAt))
		);
		const load = new Map<string, number>();
		for (const r of upcoming) load.set(r.slot.day, (load.get(r.slot.day) ?? 0) + 1);
		const days = suggestDays(missed.length, load, now);

		const yesterday = (await slotsWithSteps(db, userId, eq(planSlots.day, addDays(now, -1)))).map(
			(r) => ({ row: r, done: Boolean(r.step.doneAt) })
		);
		const first = missedYesterday(yesterday) ? yesterday.find((y) => !y.done)!.row : null;

		return {
			today: now,
			missed: missed.map((r, i) => ({
				...toBlock(r),
				day: r.slot.day,
				suggestion: {
					day: days[i],
					startTime: r.slot.startTime?.slice(0, 5) ?? null,
					anchor: r.slot.anchor,
					place: r.slot.place
				}
			})),
			neverMissTwice: first && {
				slotId: first.slot.id,
				stepTitle: first.step.title,
				twoMinute: first.step.twoMinute,
				message: `Missing once is fine. Let's not miss twice: just ${lowerFirst(
					first.step.twoMinute ?? first.step.title
				).replace(/[.!]+$/, '')} today.`
			}
		};
	});
}

export type ApplyResult =
	| { status: 'applied'; moved: number; dropped: number }
	| { status: 'invalid' };

/** Applies the moves the user OK'd; `dropped` blocks go back to unplanned; `firstToday` becomes #1. */
export async function applyReshuffle(
	platform: Platform,
	userId: string,
	input: ReshuffleInput
): Promise<ApplyResult> {
	const ids = [...input.moves.map((m) => m.slotId), ...input.drop];
	if (input.firstToday) ids.push(input.firstToday);
	const done = await withDb(platform, async (db) => {
		const now = today(await timezoneOf(db, userId));
		const owned = await slotsWithSteps(db, userId, inArray(planSlots.id, ids));
		if (new Set(owned.map((o) => o.slot.id)).size !== new Set(ids).size) return null;
		const titleOf = new Map(owned.map((o) => [o.slot.id, o.step.title]));

		await db.transaction(async (tx) => {
			for (const move of input.moves) {
				const [last] = await tx
					.select({ position: max(planSlots.position) })
					.from(planSlots)
					.where(and(eq(planSlots.userId, userId), eq(planSlots.day, move.day)));
				await tx
					.update(planSlots)
					.set({
						day: move.day,
						startTime: move.startTime ?? null,
						anchor: move.anchor ?? null,
						place: move.place ?? null,
						position: (last?.position ?? 0) + 1,
						missedAt: null
					})
					.where(eq(planSlots.id, move.slotId));
			}
			if (input.drop.length) await tx.delete(planSlots).where(inArray(planSlots.id, input.drop));
			if (input.firstToday) {
				// Never miss twice: today's #1, ahead of everything else planned today.
				const todays = await tx
					.select({ id: planSlots.id })
					.from(planSlots)
					.where(and(eq(planSlots.userId, userId), eq(planSlots.day, now)))
					.orderBy(asc(planSlots.position));
				const order = [
					input.firstToday,
					...todays.map((t) => t.id).filter((id) => id !== input.firstToday)
				];
				for (const [i, id] of order.entries()) {
					await tx
						.update(planSlots)
						.set({ day: now, position: i + 1, missedAt: null })
						.where(eq(planSlots.id, id));
				}
			}
		});
		return { now, titleOf };
	});
	if (!done) return { status: 'invalid' };

	const parts = [
		input.moves.length &&
			`moved ${input.moves.map((m) => `"${done.titleOf.get(m.slotId)}" to ${weekdayName(m.day)}`).join(', ')}`,
		input.drop.length && `unplanned ${input.drop.length}`,
		input.firstToday && `put "${done.titleOf.get(input.firstToday)}" first today after a missed day`
	].filter(Boolean);
	if (parts.length) {
		await remember(platform, userId, {
			type: 'plan_change',
			summary: `Reshuffled after missed blocks: ${parts.join('; ')}.`
		}).catch((e) => console.error('[plan] remember failed', e));
	}
	return { status: 'applied', moved: input.moves.length, dropped: input.drop.length };
}

/** Moves one block (PATCH /api/plan/slots/[id]). A time replaces an anchor and vice versa. */
export async function moveSlot(
	platform: Platform,
	userId: string,
	slotId: string,
	move: MoveInput
): Promise<boolean> {
	const rows = await withDb(platform, async (db) => {
		const [slot] = await db
			.select()
			.from(planSlots)
			.where(and(eq(planSlots.id, slotId), eq(planSlots.userId, userId)));
		if (!slot) return [];
		const day = move.day ?? slot.day;
		const [last] =
			day === slot.day
				? [{ position: slot.position - 1 }]
				: await db
						.select({ position: max(planSlots.position) })
						.from(planSlots)
						.where(and(eq(planSlots.userId, userId), eq(planSlots.day, day)));
		return db
			.update(planSlots)
			.set({
				day,
				position: (last?.position ?? 0) + 1,
				...(move.startTime !== undefined && { startTime: move.startTime, anchor: null }),
				...(move.anchor !== undefined && { anchor: move.anchor, startTime: null }),
				...(move.place !== undefined && { place: move.place }),
				missedAt: null
			})
			.where(eq(planSlots.id, slotId))
			.returning({ id: planSlots.id });
	});
	return rows.length > 0;
}

/** Unplans one block; its step stays in the roadmap for a later week. */
export async function removeSlot(
	platform: Platform,
	userId: string,
	slotId: string
): Promise<boolean> {
	const rows = await withDb(platform, (db) =>
		db
			.delete(planSlots)
			.where(and(eq(planSlots.id, slotId), eq(planSlots.userId, userId)))
			.returning({ id: planSlots.id })
	);
	return rows.length > 0;
}

export interface BusyWeekProposal {
	keep: FilledBlock[];
	moves: { stepId: string; title: string; itemTitle: string }[];
	message: string;
}

/**
 * "Only 2 blocks free this week? Here's what moves." Missed steps come first, then the rest of the
 * week in order; what doesn't fit the blocks you have moves to next week.
 */
export async function proposeBusyWeek(
	platform: Platform,
	userId: string,
	blocks: BlockRequest[]
): Promise<BusyWeekProposal> {
	return withDb(platform, async (db) => {
		const now = today(await timezoneOf(db, userId));
		await markMissed(db, userId, now);
		const rows = await slotsWithSteps(db, userId, restOfWeek(now));
		const pending = rows
			.filter((r) => !r.step.doneAt)
			.sort((a, b) => Number(Boolean(b.slot.missedAt)) - Number(Boolean(a.slot.missedAt)));
		const options = pending.map((r) => ({
			id: r.step.id,
			title: r.step.title,
			minutes: r.step.minutes,
			twoMinute: r.step.twoMinute,
			itemId: r.itemId,
			itemTitle: r.itemTitle
		}));
		const keep = fillBlocks(blocks, [options]);
		const kept = new Set(keep.map((k) => k.step?.id));
		const moves = options
			.filter((o) => !kept.has(o.id))
			.map((o) => ({ stepId: o.id, title: o.title, itemTitle: o.itemTitle }));
		const message = moves.length
			? `Only ${blocks.length} block${blocks.length === 1 ? '' : 's'} free this week? Here's what moves to next week: ${moves.map((m) => m.title).join('; ')}.`
			: `Everything still fits in ${blocks.length} block${blocks.length === 1 ? '' : 's'}.`;
		return { keep, moves, message };
	});
}

/** Applies a busy week: the rest of this week (and missed blocks) is replaced by these blocks. */
export async function applyBusyWeek(
	platform: Platform,
	userId: string,
	input: SaveWeekInput
): Promise<ApplyResult> {
	const saved = await withDb(platform, async (db) => {
		const now = today(await timezoneOf(db, userId));
		const stepIds = input.blocks.map((b) => b.stepId);
		const owned = await slotsWithSteps(db, userId, inArray(planSlots.stepId, stepIds));
		// Busy-week blocks can only hold steps that were already planned this week.
		if (owned.length !== stepIds.length) return null;
		const before = await slotsWithSteps(db, userId, restOfWeek(now));
		await db.transaction(async (tx) => {
			await tx.delete(planSlots).where(
				inArray(
					planSlots.id,
					before.filter((b) => !b.step.doneAt).map((b) => b.slot.id)
				)
			);
			await tx.insert(planSlots).values(slotRows(userId, input.blocks));
		});
		return before.filter((b) => !b.step.doneAt).length - input.blocks.length;
	});
	if (saved === null) return { status: 'invalid' };

	await remember(platform, userId, {
		type: 'plan_change',
		summary: `Busy week: kept ${input.blocks.length} blocks; ${Math.max(saved, 0)} steps moved to next week.`
	}).catch((e) => console.error('[plan] remember failed', e));
	return { status: 'applied', moved: Math.max(saved, 0), dropped: 0 };
}

/** From today to Sunday, plus missed blocks from the last two weeks. */
function restOfWeek(now: string) {
	return or(
		and(gte(planSlots.day, now), lte(planSlots.day, addDays(weekStart(now), 6))),
		and(isNotNull(planSlots.missedAt), gte(planSlots.day, addDays(now, -LOOKBACK_DAYS)))
	);
}

function lowerFirst(text: string): string {
	return text.charAt(0).toLowerCase() + text.slice(1);
}
