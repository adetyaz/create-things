/**
 * Google Calendar (needs-input.md K1): busy times from free/busy, and planned blocks written as
 * real events with a 10-minute alert, so the phone's own calendar reminds them. Event ids come
 * from the block ids, so writing again updates instead of duplicating; unplanned blocks are removed.
 */
import { and, eq, gte, lt, ne } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import {
	busyTimes,
	items,
	planSlots,
	roadmaps,
	roadmapSteps,
	userSettings
} from '$lib/server/db/schema';
import { accessToken } from '$lib/server/features/sources/service';
import { addDays } from '$lib/server/features/plan/dates';
import { anchorTimesOf } from '$lib/server/features/plan/anchors';
import { intention } from '$lib/server/features/plan/fill';
import { localNow, zonedTime } from '$lib/server/features/reminders/clock';

type Platform = App.Platform | undefined;
const API = 'https://www.googleapis.com/calendar/v3';
const DAYS_AHEAD = 14;

async function google<T>(token: string, path: string, init: RequestInit = {}): Promise<T | null> {
	const res = await fetch(`${API}${path}`, {
		...init,
		headers: {
			authorization: `Bearer ${token}`,
			'content-type': 'application/json',
			...(init.headers ?? {})
		}
	});
	if (res.status === 404 || res.status === 410) return null;
	if (!res.ok) throw new Error(`Google Calendar ${path.split('?')[0]} → ${res.status}`);
	return res.status === 204 ? null : ((await res.json()) as T);
}

/** Google event ids: base32hex (0-9, a-v), so a block's uuid without dashes works as-is. */
export function eventIdFor(slotId: string): string {
	return `ct${slotId.replace(/-/g, '')}`;
}

/** Busy times for the next 3 weeks from free/busy (only start and end; never titles). */
export async function refreshGoogleBusy(platform: Platform, userId: string): Promise<number> {
	const token = await accessToken(platform, userId, 'google_calendar').catch(() => null);
	if (!token) return 0;
	const timeMin = new Date();
	const timeMax = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
	const reply = await google<{
		calendars: Record<string, { busy: { start: string; end: string }[] }>;
	}>(token, '/freeBusy', {
		method: 'POST',
		body: JSON.stringify({
			timeMin: timeMin.toISOString(),
			timeMax: timeMax.toISOString(),
			items: [{ id: 'primary' }]
		})
	});
	const busy = reply?.calendars?.primary?.busy ?? [];
	await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			await tx
				.delete(busyTimes)
				.where(and(eq(busyTimes.userId, userId), eq(busyTimes.source, 'google')));
			if (busy.length) {
				await tx
					.insert(busyTimes)
					.values(
						busy.map((b) => ({
							userId,
							source: 'google',
							startsAt: new Date(b.start),
							endsAt: new Date(b.end)
						}))
					);
			}
		})
	);
	return busy.length;
}

/**
 * Writes the next two weeks of planned blocks as events (with alerts), updates moved ones and
 * removes ones no longer planned. Our own blocks are skipped when reading busy times back.
 */
export async function syncGoogleEvents(platform: Platform, userId: string) {
	const token = await accessToken(platform, userId, 'google_calendar').catch(() => null);
	if (!token) return { status: 'not_connected' as const };
	const { rows, zone, anchors, today } = await withDb(platform, async (db) => {
		const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
		const zone = settings?.timezone ?? 'UTC';
		const today = localNow(zone).day;
		const rows = await db
			.select({ slot: planSlots, step: roadmapSteps, itemTitle: items.title })
			.from(planSlots)
			.innerJoin(roadmapSteps, eq(roadmapSteps.id, planSlots.stepId))
			.innerJoin(roadmaps, eq(roadmaps.id, roadmapSteps.roadmapId))
			.innerJoin(items, eq(items.id, roadmaps.itemId))
			.where(
				and(
					eq(planSlots.userId, userId),
					gte(planSlots.day, today),
					lt(planSlots.day, addDays(today, DAYS_AHEAD)),
					ne(items.status, 'archived')
				)
			);
		return { rows, zone, anchors: anchorTimesOf(settings?.anchorTimes), today };
	});

	const wanted = new Set<string>();
	let written = 0;
	for (const { slot, step, itemTitle } of rows) {
		const time = slot.startTime?.slice(0, 5) ?? (slot.anchor ? anchors[slot.anchor] : undefined);
		if (!time || step.doneAt) continue;
		const start = zonedTime(slot.day, time, zone);
		const end = new Date(start.getTime() + (step.minutes ?? 25) * 60_000);
		const id = eventIdFor(slot.id);
		wanted.add(id);
		const event = {
			id,
			summary: step.title,
			description: `${intention(slot, step.title)}\n${itemTitle}${step.twoMinute ? `\n2-minute start: ${step.twoMinute}` : ''}`,
			location: slot.place ?? undefined,
			start: { dateTime: start.toISOString() },
			end: { dateTime: end.toISOString() },
			reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 10 }] },
			extendedProperties: { private: { createthings: '1' } },
			transparency: 'transparent'
		};
		const updated = await google(token, `/calendars/primary/events/${id}`, {
			method: 'PUT',
			body: JSON.stringify(event)
		});
		if (!updated) {
			await google(token, '/calendars/primary/events', {
				method: 'POST',
				body: JSON.stringify(event)
			});
		}
		written++;
	}

	// Blocks that were moved away or unplanned: remove their events.
	const ours = await google<{ items: { id: string }[] }>(
		token,
		`/calendars/primary/events?privateExtendedProperty=createthings%3D1&timeMin=${encodeURIComponent(zonedTime(today, '00:00', zone).toISOString())}&maxResults=250`
	);
	let removed = 0;
	for (const e of ours?.items ?? []) {
		if (!wanted.has(e.id)) {
			await google(token, `/calendars/primary/events/${e.id}`, { method: 'DELETE' });
			removed++;
		}
	}
	return { status: 'synced' as const, written, removed };
}

/** After the plan changes: update Google quietly (never fails the plan change). */
export function syncGoogleQuietly(platform: Platform, userId: string) {
	return syncGoogleEvents(platform, userId).catch((e) => {
		console.error('[calendar] google sync failed', e);
		return null;
	});
}
