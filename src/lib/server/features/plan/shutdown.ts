/**
 * The daily shutdown (Deep Work's shutdown ritual + the Ivy Lee method): what got done, what moves,
 * and tomorrow's top 3, then one session summary in memory. Free: no AI call.
 */
import { and, eq, gt, gte, inArray, isNull } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items, planSlots, roadmaps, roadmapSteps, userSettings } from '$lib/server/db/schema';
import { listFocus } from '$lib/server/features/focus/service';
import { remember } from '$lib/server/features/memory/service';
import { getRoadmap } from '$lib/server/features/roadmap/service';
import { slotsWithSteps } from './context';
import { addDays, today } from './dates';
import { getDay, rankTomorrow, type DayBlock } from './day';
import type { ShutdownInput } from './input';
import { applyReshuffle } from './reshuffle';
import { suggestDays } from './rules';

type Platform = App.Platform | undefined;

export interface ShutdownView {
	today: string;
	/** True once the user's shutdown time has passed today. */
	due: boolean;
	shutdownTime: string;
	done: string[];
	/** Today's blocks that weren't done, each with a suggested new slot. */
	moves: (DayBlock & {
		suggestion: {
			day: string;
			startTime: string | null;
			anchor: string | null;
			place: string | null;
		};
	})[];
	/** Tomorrow's top 3, pre-filled: planned blocks first, then each Focus item's current step. */
	tomorrow: { stepId: string; title: string; itemTitle: string; twoMinute: string | null }[];
}

export async function getShutdown(platform: Platform, userId: string): Promise<ShutdownView> {
	const settings = await withDb(platform, async (db) => {
		const [row] = await db
			.select({ timezone: userSettings.timezone, shutdownTime: userSettings.shutdownTime })
			.from(userSettings)
			.where(eq(userSettings.userId, userId));
		return {
			timezone: row?.timezone ?? 'UTC',
			shutdownTime: (row?.shutdownTime ?? '21:00').slice(0, 5)
		};
	});
	const now = new Date();
	const day = today(settings.timezone, now);
	const tomorrowDay = addDays(day, 1);

	const [todayView, tomorrowView, done, upcoming] = await Promise.all([
		getDay(platform, userId, day),
		getDay(platform, userId, tomorrowDay),
		doneToday(platform, userId, settings.timezone, day),
		withDb(platform, (db) =>
			slotsWithSteps(db, userId, and(gte(planSlots.day, tomorrowDay), isNull(planSlots.missedAt)))
		)
	]);

	const unfinished = todayView.blocks.filter((b) => !b.step.done);
	const load = new Map<string, number>();
	for (const r of upcoming) load.set(r.slot.day, (load.get(r.slot.day) ?? 0) + 1);
	const days = suggestDays(unfinished.length, load, tomorrowDay);

	// Tomorrow: what's planned, then the next step of each Focus item, up to 3.
	const tomorrow: ShutdownView['tomorrow'] = tomorrowView.blocks
		.filter((b) => !b.step.done)
		.map((b) => ({
			stepId: b.step.id,
			title: b.step.title,
			itemTitle: b.item.title,
			twoMinute: b.step.twoMinute
		}));
	if (tomorrow.length < 3) {
		for (const item of await listFocus(platform, userId)) {
			const step = (await getRoadmap(platform, userId, item.id))?.currentStep;
			if (step && !tomorrow.some((t) => t.stepId === step.id)) {
				tomorrow.push({
					stepId: step.id,
					title: step.title,
					itemTitle: item.title,
					twoMinute: step.twoMinute
				});
			}
		}
	}

	return {
		today: day,
		due: localTime(settings.timezone, now) >= settings.shutdownTime,
		shutdownTime: settings.shutdownTime,
		done,
		moves: unfinished.map((b, i) => ({
			...b,
			suggestion: { day: days[i], startTime: b.startTime, anchor: b.anchor, place: b.place }
		})),
		tomorrow: tomorrow.slice(0, 3)
	};
}

export type ShutdownResult = { status: 'wrapped'; summary: string } | { status: 'invalid' };

export async function applyShutdown(
	platform: Platform,
	userId: string,
	input: ShutdownInput
): Promise<ShutdownResult> {
	const view = await getShutdown(platform, userId);
	if (input.moves.length || input.drop.length) {
		const moved = await applyReshuffle(platform, userId, { moves: input.moves, drop: input.drop });
		if (moved.status === 'invalid') return { status: 'invalid' };
	}
	let first: string | null = null;
	if (input.tomorrow.length) {
		const ranked = await rankTomorrow(platform, userId, input.tomorrow);
		if (ranked.status === 'invalid') return { status: 'invalid' };
		first = ranked.tomorrow.first?.step.title ?? null;
	}

	const parts = [
		view.done.length
			? `finished ${view.done.length} step${view.done.length === 1 ? '' : 's'} (${view.done.slice(0, 3).join('; ')})`
			: 'nothing finished today',
		input.moves.length ? `moved ${input.moves.length} to another day` : '',
		first ? `first tomorrow: ${first}` : '',
		input.note ? `their note: ${input.note.slice(0, 200)}` : ''
	].filter(Boolean);
	const summary = `Wrapped up ${view.today}: ${parts.join(', ')}`;
	await remember(platform, userId, { type: 'session_summary', summary: `${summary}.` }).catch((e) =>
		console.error('[shutdown] remember failed', e)
	);
	return { status: 'wrapped', summary: `${summary}.` };
}

/** Titles of steps finished today in the user's timezone. */
async function doneToday(platform: Platform, userId: string, timezone: string, day: string) {
	const rows = await withDb(platform, (db) =>
		db
			.select({ title: roadmapSteps.title, doneAt: roadmapSteps.doneAt })
			.from(roadmapSteps)
			.innerJoin(roadmaps, eq(roadmaps.id, roadmapSteps.roadmapId))
			.innerJoin(items, eq(items.id, roadmaps.itemId))
			.where(
				and(
					eq(items.userId, userId),
					inArray(items.status, ['focus', 'shortlist', 'paused', 'done', 'ready']),
					gt(roadmapSteps.doneAt, new Date(Date.now() - 36 * 60 * 60 * 1000))
				)
			)
	);
	return rows.filter((r) => r.doneAt && today(timezone, r.doneAt) === day).map((r) => r.title);
}

/** "21:30" in the user's timezone. */
function localTime(timezone: string, now: Date): string {
	try {
		return new Intl.DateTimeFormat('en-GB', {
			timeZone: timezone,
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).format(now);
	} catch {
		return now.toISOString().slice(11, 16);
	}
}
