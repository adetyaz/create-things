/**
 * The user's calendar: busy times read from an ICS link (refreshed at most hourly, when needed),
 * clashes flagged on planned blocks, and a private ICS feed of their blocks to subscribe to.
 * Google Calendar events with real alerts come with sign-in (needs-input K1).
 */
import { and, eq, gte, gt, lt, ne } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import {
	busyTimes,
	items,
	planSlots,
	roadmaps,
	roadmapSteps,
	userSettings
} from '$lib/server/db/schema';
import { addDays } from '$lib/server/features/plan/dates';
import { intention } from '$lib/server/features/plan/fill';
import { localNow, zonedTime } from '$lib/server/features/reminders/clock';
import { anchorTimesOf } from '$lib/server/features/plan/anchors';
import { busyFromIcs, icsFeed, type Busy } from './ics';

type Platform = App.Platform | undefined;

/** How often an ICS link is read again, and how far ahead busy times are kept. */
const REFRESH_MINUTES = 60;
const WINDOW_DAYS = 21;

async function settingsRow(platform: Platform, userId: string) {
	const [row] = await withDb(platform, (db) =>
		db.select().from(userSettings).where(eq(userSettings.userId, userId))
	);
	return row ?? null;
}

/** webcal:// links are https:// links. Only http(s) after that. */
export function normaliseIcsUrl(url: string): string | null {
	const fixed = url.trim().replace(/^webcals?:\/\//i, 'https://');
	return /^https?:\/\/\S+$/i.test(fixed) ? fixed : null;
}

export type IcsResult = { status: 'saved'; busy: number } | { status: 'invalid'; message: string };

/** Saves (or clears, with null) the ICS link and reads it straight away. */
export async function setIcsUrl(
	platform: Platform,
	userId: string,
	url: string | null
): Promise<IcsResult> {
	const icsUrl = url === null ? null : normaliseIcsUrl(url);
	if (url !== null && !icsUrl)
		return { status: 'invalid', message: 'Use the https or webcal link your calendar gives you' };
	await withDb(platform, async (db) => {
		await db
			.insert(userSettings)
			.values({ userId, icsUrl, icsFetchedAt: null })
			.onConflictDoUpdate({ target: userSettings.userId, set: { icsUrl, icsFetchedAt: null } });
		if (!icsUrl) {
			await db
				.delete(busyTimes)
				.where(and(eq(busyTimes.userId, userId), eq(busyTimes.source, 'ics')));
		}
	});
	if (!icsUrl) return { status: 'saved', busy: 0 };
	try {
		return { status: 'saved', busy: await refreshBusy(platform, userId, true) };
	} catch (e) {
		return {
			status: 'invalid',
			message: `Couldn't read that calendar: ${e instanceof Error ? e.message : e}`
		};
	}
}

/**
 * Reads the ICS link again if it's older than an hour (or `force`), replacing the saved busy times.
 * Returns how many busy times are saved ahead.
 */
export async function refreshBusy(
	platform: Platform,
	userId: string,
	force = false
): Promise<number> {
	const settings = await settingsRow(platform, userId);
	if (!settings?.icsUrl) return 0;
	const fresh =
		settings.icsFetchedAt &&
		Date.now() - settings.icsFetchedAt.getTime() < REFRESH_MINUTES * 60_000;
	if (fresh && !force) return -1;

	const res = await fetch(settings.icsUrl, { headers: { accept: 'text/calendar' } });
	if (!res.ok) throw new Error(`the calendar answered ${res.status}`);
	const text = await res.text();
	if (!text.includes('BEGIN:VCALENDAR')) throw new Error("that link isn't a calendar (ICS) file");
	const from = new Date(Date.now() - 24 * 60 * 60_000);
	const to = new Date(Date.now() + WINDOW_DAYS * 24 * 60 * 60_000);
	const busy = busyFromIcs(text, from, to, settings.timezone);

	await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			await tx
				.delete(busyTimes)
				.where(and(eq(busyTimes.userId, userId), eq(busyTimes.source, 'ics')));
			if (busy.length) {
				await tx
					.insert(busyTimes)
					.values(
						busy.map((b) => ({ userId, source: 'ics', startsAt: b.startsAt, endsAt: b.endsAt }))
					);
			}
			await tx
				.update(userSettings)
				.set({ icsFetchedAt: new Date() })
				.where(eq(userSettings.userId, userId));
		})
	);
	return busy.length;
}

/** Busy times overlapping [from, to), refreshing the ICS link first if it's due. */
export async function busyBetween(
	platform: Platform,
	userId: string,
	from: Date,
	to: Date
): Promise<Busy[]> {
	await refreshBusy(platform, userId).catch((e) => console.error('[calendar] refresh failed', e));
	return withDb(platform, (db) =>
		db
			.select({ startsAt: busyTimes.startsAt, endsAt: busyTimes.endsAt })
			.from(busyTimes)
			.where(
				and(eq(busyTimes.userId, userId), lt(busyTimes.startsAt, to), gt(busyTimes.endsAt, from))
			)
	);
}

/** When a block happens: its clock time, or its habit anchor's usual time. Null: no time known. */
export function blockTime(
	block: { startTime: string | null; anchor: string | null },
	anchorTimes: Record<string, string>
): string | null {
	return (
		block.startTime?.slice(0, 5) ?? (block.anchor ? (anchorTimes[block.anchor] ?? null) : null)
	);
}

export interface Clash {
	day: string;
	time: string;
	/** Local "HH:MM–HH:MM" of the busy time it overlaps. */
	busy: string;
}

/**
 * Flags blocks that land on a busy time (planning around the user's real calendar). Blocks are any
 * shape with a day, time or anchor and minutes; returns one entry per block (null: no clash).
 */
export async function clashesFor(
	platform: Platform,
	userId: string,
	blocks: { day: string; startTime?: string | null; anchor?: string | null; minutes: number }[]
): Promise<(Clash | null)[]> {
	const settings = await settingsRow(platform, userId);
	if (!settings?.icsUrl || !blocks.length) return blocks.map(() => null);
	const zone = settings.timezone;
	const anchors = anchorTimesOf(settings.anchorTimes);
	const days = blocks.map((b) => b.day).sort();
	const busy = await busyBetween(
		platform,
		userId,
		zonedTime(days[0], '00:00', zone),
		zonedTime(addDays(days.at(-1)!, 1), '00:00', zone)
	);
	const hhmm = (d: Date) => {
		const m = localNow(zone, d).minutes;
		return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
	};
	return blocks.map((b) => {
		const time = blockTime({ startTime: b.startTime ?? null, anchor: b.anchor ?? null }, anchors);
		if (!time) return null;
		const start = zonedTime(b.day, time, zone);
		const end = new Date(start.getTime() + b.minutes * 60_000);
		const hit = busy.find((x) => x.startsAt < end && x.endsAt > start);
		return hit ? { day: b.day, time, busy: `${hhmm(hit.startsAt)}–${hhmm(hit.endsAt)}` } : null;
	});
}

/** The private feed link: made once, rotated on request (the old link stops working). */
export async function feedToken(
	platform: Platform,
	userId: string,
	rotate = false
): Promise<string> {
	const settings = await settingsRow(platform, userId);
	if (settings?.calendarFeedToken && !rotate) return settings.calendarFeedToken;
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	await withDb(platform, (db) =>
		db
			.insert(userSettings)
			.values({ userId, calendarFeedToken: token })
			.onConflictDoUpdate({ target: userSettings.userId, set: { calendarFeedToken: token } })
	);
	return token;
}

/** The ICS feed for a feed token: planned blocks from a week ago to a month ahead. Null: bad token. */
export async function feedFor(platform: Platform, token: string): Promise<string | null> {
	if (!/^[0-9a-f]{48}$/.test(token)) return null;
	return withDb(platform, async (db) => {
		const [settings] = await db
			.select()
			.from(userSettings)
			.where(eq(userSettings.calendarFeedToken, token));
		if (!settings) return null;
		const zone = settings.timezone;
		const anchors = anchorTimesOf(settings.anchorTimes);
		const today = localNow(zone).day;
		const rows = await db
			.select({ slot: planSlots, step: roadmapSteps, itemTitle: items.title })
			.from(planSlots)
			.innerJoin(roadmapSteps, eq(roadmapSteps.id, planSlots.stepId))
			.innerJoin(roadmaps, eq(roadmaps.id, roadmapSteps.roadmapId))
			.innerJoin(items, eq(items.id, roadmaps.itemId))
			.where(
				and(
					eq(planSlots.userId, settings.userId),
					gte(planSlots.day, addDays(today, -7)),
					lt(planSlots.day, addDays(today, 31)),
					ne(items.status, 'archived')
				)
			);
		const events = rows.flatMap(({ slot, step, itemTitle }) => {
			const time = blockTime(slot, anchors);
			if (!time) return [];
			return [
				{
					uid: slot.id,
					startsAt: zonedTime(slot.day, time, zone),
					minutes: step.minutes ?? 25,
					title: step.doneAt ? `✓ ${step.title}` : step.title,
					description: `${intention(slot, step.title)}\n${itemTitle}${step.twoMinute ? `\n2-minute start: ${step.twoMinute}` : ''}`,
					location: slot.place
				}
			];
		});
		return icsFeed('createthings', events);
	});
}

/** What the calendar settings screen shows. */
export async function calendarStatus(platform: Platform, userId: string, origin: string) {
	const settings = await settingsRow(platform, userId);
	const now = new Date();
	const ahead = settings?.icsUrl
		? await busyBetween(platform, userId, now, new Date(now.getTime() + 7 * 24 * 60 * 60_000))
		: [];
	return {
		ics: settings?.icsUrl
			? { connected: true, lastRead: settings.icsFetchedAt, busyNext7Days: ahead.length }
			: { connected: false },
		feedUrl: settings?.calendarFeedToken
			? `${origin}/api/calendar/feed/${settings.calendarFeedToken}.ics`
			: null,
		google: { connected: false, needs: 'sign-in with Google (needs-input K1)' }
	};
}
