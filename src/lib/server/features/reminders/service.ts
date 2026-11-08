/**
 * Reminders: what the pet nudges you about right now, worked out when asked (no background job
 * needed: the extension asks every few minutes; email and push later ask the same way).
 *
 * Rules (design PRD C22): a daily limit (default 3), quiet hours, nothing during a busy calendar
 * slot, each reminder once (by key), in the pet's voice, and every one leads to its thing with a
 * way to act (Start, the 2-minute version, Move it, Done). Free: no AI, no Walrus.
 */
import { and, desc, eq, gte, gt, isNull, lt, sql } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { busyTimes, journalEntries, reminders, userSettings } from '$lib/server/db/schema';
import { getDay } from '$lib/server/features/plan/day';
import { getReshuffle, moveSlot } from '$lib/server/features/plan/reshuffle';
import { addDays, weekStart, weekdayOf } from '$lib/server/features/plan/dates';
import { dueCards } from '$lib/server/features/cards/service';
import { getPet } from '$lib/server/features/pet/service';
import { completeStep } from '$lib/server/features/roadmap/service';
import { isCheckInDay, rhythmSchema, type Rhythm } from '$lib/server/features/templates/rhythm';
import { inQuietHours, localNow, minutesOf, zonedTime } from './clock';
import { line, toneOf } from './lines';
import { anchorTimesOf } from '$lib/server/features/plan/anchors';
import { refreshBusy } from '$lib/server/features/calendar/service';

type Platform = App.Platform | undefined;
export type Reminder = typeof reminders.$inferSelect;
export type ReminderAction = 'start' | 'two_minute' | 'move' | 'done' | 'open' | 'dismiss';

/** Order when the daily limit can't fit them all: the plan first, the pet last. */
const PRIORITY = [
	'block_start',
	'never_miss_twice',
	'check_in',
	'shutdown',
	'reviews_due',
	'weekly_plan',
	'pet_hungry'
];

/** When a block's reminder starts and stops being useful, around its time. */
const BLOCK_LEAD_MIN = 10;
const BLOCK_LATE_MIN = 60;

interface Candidate {
	kind: string;
	key: string;
	title: string;
	body: string;
	link: Record<string, unknown>;
	actions: { action: ReminderAction; label: string }[];
	dueAt: Date;
}

async function settingsOf(platform: Platform, userId: string) {
	const [row] = await withDb(platform, (db) =>
		db.select().from(userSettings).where(eq(userSettings.userId, userId))
	);
	return {
		timezone: row?.timezone ?? 'UTC',
		tone: row?.tone ?? 50,
		quietStart: row?.quietStart ?? '22:00',
		quietEnd: row?.quietEnd ?? '08:00',
		shutdownTime: row?.shutdownTime ?? '21:00',
		weeklyPlanDay: row?.weeklyPlanDay ?? 0,
		weeklyPlanTime: row?.weeklyPlanTime ?? '18:00',
		perDay: row?.remindersPerDay ?? 3,
		anchorTimes: anchorTimesOf(row?.anchorTimes),
		rhythm: row?.rhythm ? (rhythmSchema.safeParse(row.rhythm).data ?? null) : null
	};
}

type Settings = Awaited<ReturnType<typeof settingsOf>>;

/** Everything that could be due now, before the limits. */
async function candidates(
	platform: Platform,
	userId: string,
	s: Settings,
	now: Date
): Promise<Candidate[]> {
	const { day, minutes } = localNow(s.timezone, now);
	const tone = toneOf(s.tone);
	const pet = await getPet(platform, userId).catch(() => null);
	const petName = pet && pet.mood !== 'dead' ? pet.pet.name : 'createthings';
	const say = (kind: string, values: Record<string, string>) =>
		line(kind, tone, { pet: petName, ...values });
	const at = (time: string) => zonedTime(day, time, s.timezone);
	const out: Candidate[] = [];

	// Blocks starting now (a clock time, or a habit anchor's usual time).
	const today = await getDay(platform, userId);
	for (const block of today.blocks) {
		if (block.step.done || block.missed) continue;
		const time =
			block.startTime?.slice(0, 5) ?? (block.anchor ? s.anchorTimes[block.anchor] : undefined);
		if (!time) continue;
		const t = minutesOf(time);
		if (minutes < t - BLOCK_LEAD_MIN || minutes > t + BLOCK_LATE_MIN) continue;
		out.push({
			kind: 'block_start',
			key: `block:${block.slotId}`,
			title: block.step.title,
			body: say('block_start', { step: block.step.title }),
			link: { screen: 'today', slotId: block.slotId, stepId: block.step.id, itemId: block.item.id },
			actions: [
				{ action: 'start', label: 'Start' },
				...(block.step.twoMinute
					? [{ action: 'two_minute' as const, label: block.step.twoMinute }]
					: []),
				{ action: 'done', label: 'Done' },
				{ action: 'move', label: 'Move to tomorrow' }
			],
			dueAt: at(time)
		});
	}

	// After a missed day: yesterday's step, smallest version first.
	const reshuffle = await getReshuffle(platform, userId);
	const nmt = reshuffle.neverMissTwice;
	if (nmt && minutes >= minutesOf(s.quietEnd)) {
		out.push({
			kind: 'never_miss_twice',
			key: `nmt:${day}`,
			title: "Let's not miss twice",
			body: say('never_miss_twice', { step: nmt.stepTitle, twoMinute: nmt.twoMinute ?? '' }),
			link: { screen: 'today', slotId: nmt.slotId },
			actions: [
				{ action: 'two_minute', label: nmt.twoMinute ?? 'Just open it' },
				{ action: 'open', label: 'See today' }
			],
			dueAt: at(s.quietEnd)
		});
	}

	// Check-in by the user's rhythm (once they have one).
	if (s.rhythm && minutes >= minutesOf(s.rhythm.time)) {
		const last = await lastCheckInDay(platform, userId, s.timezone);
		if (isCheckInDay(s.rhythm, day, last)) {
			const about = today.blocks[0]?.item.title ?? 'what you worked on';
			out.push({
				kind: 'check_in',
				key: `check_in:${day}`,
				title: 'Check-in',
				body: say('check_in', { about: `"${about}"` }),
				link: { screen: 'journal', itemId: today.blocks[0]?.item.id ?? null },
				actions: [{ action: 'open', label: 'Write one line' }],
				dueAt: at(s.rhythm.time)
			});
		}
	}

	// Shutdown at the user's time.
	const shutdown = s.shutdownTime.slice(0, 5);
	if (minutes >= minutesOf(shutdown)) {
		out.push({
			kind: 'shutdown',
			key: `shutdown:${day}`,
			title: 'Wrap up today',
			body: say('shutdown', {}),
			link: { screen: 'shutdown' },
			actions: [{ action: 'open', label: 'Wrap up' }],
			dueAt: at(shutdown)
		});
	}

	// Reviews, once a day after mid-morning.
	if (minutes >= 11 * 60) {
		const { cards } = await dueCards(platform, userId);
		if (cards.length) {
			out.push({
				kind: 'reviews_due',
				key: `reviews:${day}`,
				title: `${cards.length} to review`,
				body: say('reviews_due', { count: String(cards.length) }),
				link: { screen: 'reviews' },
				actions: [{ action: 'open', label: 'Review now' }],
				dueAt: at('11:00')
			});
		}
	}

	// The weekly plan on the user's plan day.
	if (weekdayOf(day) === s.weeklyPlanDay && minutes >= minutesOf(s.weeklyPlanTime.slice(0, 5))) {
		out.push({
			kind: 'weekly_plan',
			key: `weekly:${weekStart(addDays(day, 1))}`,
			title: 'Plan the week',
			body: say('weekly_plan', {}),
			link: { screen: 'week' },
			actions: [{ action: 'open', label: 'Plan it' }],
			dueAt: at(s.weeklyPlanTime.slice(0, 5))
		});
	}

	// A hungry pet: once per mood per hungry spell, not every day.
	if (pet && ['peckish', 'hungry', 'starving'].includes(pet.mood) && minutes >= 12 * 60) {
		const spell = addDays(day, -pet.daysWithoutFood);
		out.push({
			kind: 'pet_hungry',
			key: `pet:${pet.mood}:${spell}`,
			title: `${pet.pet.name} is ${pet.mood}`,
			body: say('pet_hungry', { mood: pet.mood }),
			link: { screen: 'pet' },
			actions: [{ action: 'open', label: 'See why' }],
			dueAt: at('12:00')
		});
	}
	return out;
}

async function lastCheckInDay(
	platform: Platform,
	userId: string,
	timezone: string
): Promise<string | null> {
	const [row] = await withDb(platform, (db) =>
		db
			.select({ at: journalEntries.createdAt })
			.from(journalEntries)
			.where(eq(journalEntries.userId, userId))
			.orderBy(desc(journalEntries.createdAt))
			.limit(1)
	);
	return row ? localNow(timezone, row.at).day : null;
}

async function busyNow(platform: Platform, userId: string, now: Date): Promise<boolean> {
	// Reads the calendar link again if it's over an hour old.
	await refreshBusy(platform, userId).catch((e) => console.error('[reminders] calendar', e));
	const [row] = await withDb(platform, (db) =>
		db
			.select({ id: busyTimes.id })
			.from(busyTimes)
			.where(
				and(eq(busyTimes.userId, userId), lt(busyTimes.startsAt, now), gt(busyTimes.endsAt, now))
			)
			.limit(1)
	);
	return !!row;
}

export interface ReminderCheck {
	/** Newly due and not yet shown on this channel: show these now. */
	fresh: Reminder[];
	/** Today's reminders not acted on yet (shown before), newest first. */
	open: Reminder[];
	/** Why nothing new went out, when held back: plain words (principle 18). */
	held: string | null;
	limit: { perDay: number; usedToday: number };
}

/**
 * Works out what's due now, saves new reminders within the limits, and returns them. `channel`
 * marks the fresh ones as shown there ("extension", "email", "push").
 */
export async function checkReminders(
	platform: Platform,
	userId: string,
	channel: string,
	now = new Date()
): Promise<ReminderCheck> {
	const s = await settingsOf(platform, userId);
	const { day, minutes } = localNow(s.timezone, now);
	const startOfDay = zonedTime(day, '00:00', s.timezone);

	let held: string | null = null;
	if (inQuietHours(minutes, s.quietStart.slice(0, 5), s.quietEnd.slice(0, 5))) {
		held = `Quiet hours (${s.quietStart.slice(0, 5)}–${s.quietEnd.slice(0, 5)})`;
	} else if (await busyNow(platform, userId, now)) {
		held = "You're busy in your calendar right now";
	}

	const [{ count }] = await withDb(platform, (db) =>
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(reminders)
			.where(and(eq(reminders.userId, userId), gte(reminders.createdAt, startOfDay)))
	);
	let usedToday = count;

	if (!held) {
		const room = s.perDay - usedToday;
		if (room <= 0) {
			held = `Today's limit of ${s.perDay} reminders is reached`;
		} else {
			const wanted = (await candidates(platform, userId, s, now)).sort(
				(a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind)
			);
			let added = 0;
			for (const c of wanted) {
				if (added >= room) break;
				const inserted = await withDb(platform, (db) =>
					db
						.insert(reminders)
						.values({ userId, ...c })
						.onConflictDoNothing()
						.returning({ id: reminders.id })
				);
				added += inserted.length;
			}
			usedToday += added;
		}
	}

	return withDb(platform, async (db) => {
		const todays = await db
			.select()
			.from(reminders)
			.where(
				and(
					eq(reminders.userId, userId),
					gte(reminders.createdAt, startOfDay),
					isNull(reminders.actedAt)
				)
			)
			.orderBy(desc(reminders.createdAt));
		const fresh = todays.filter((r) => !r.deliveredAt);
		if (fresh.length) {
			await db
				.update(reminders)
				.set({ deliveredAt: now, deliveredVia: channel })
				.where(
					and(
						eq(reminders.userId, userId),
						isNull(reminders.deliveredAt),
						gte(reminders.createdAt, startOfDay)
					)
				);
		}
		return {
			fresh,
			open: todays.filter((r) => r.deliveredAt),
			held,
			limit: { perDay: s.perDay, usedToday }
		};
	});
}

export type ActResult =
	| { status: 'done'; reminder: Reminder; result?: unknown }
	| { status: 'not_found' }
	| { status: 'invalid'; message: string };

/**
 * Acts on a reminder: Done marks its step done (which feeds the pet), Move puts the block on
 * tomorrow at the same time, the rest just record what was chosen.
 */
export async function actOnReminder(
	platform: Platform,
	userId: string,
	id: string,
	action: ReminderAction
): Promise<ActResult> {
	const [reminder] = await withDb(platform, (db) =>
		db
			.select()
			.from(reminders)
			.where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
	);
	if (!reminder) return { status: 'not_found' };
	const link = reminder.link as { slotId?: string; stepId?: string };

	let result: unknown;
	if (action === 'done') {
		if (!link.stepId) return { status: 'invalid', message: 'This reminder has no step to finish' };
		result = await completeStep(platform, userId, link.stepId);
	}
	if (action === 'move') {
		if (!link.slotId) return { status: 'invalid', message: 'This reminder has no block to move' };
		const s = await settingsOf(platform, userId);
		const tomorrow = addDays(localNow(s.timezone).day, 1);
		result = {
			moved: await moveSlot(platform, userId, link.slotId, { day: tomorrow }),
			to: tomorrow
		};
	}
	const [updated] = await withDb(platform, (db) =>
		db
			.update(reminders)
			.set({ actedAt: new Date(), action })
			.where(eq(reminders.id, id))
			.returning()
	);
	return { status: 'done', reminder: updated, result };
}

/** Reminder settings: how many a day, and usual times for habit anchors. */
export async function setReminderSettings(
	platform: Platform,
	userId: string,
	input: { perDay?: number; anchorTimes?: Record<string, string> }
) {
	const values = {
		...(input.perDay !== undefined && { remindersPerDay: input.perDay }),
		...(input.anchorTimes && { anchorTimes: input.anchorTimes })
	};
	await withDb(platform, (db) =>
		db
			.insert(userSettings)
			.values({ userId, ...values })
			.onConflictDoUpdate({ target: userSettings.userId, set: values })
	);
	return settingsOf(platform, userId);
}

export type { Rhythm };
