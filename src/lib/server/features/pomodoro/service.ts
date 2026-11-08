/**
 * Pomodoro sessions (design PRD C15): start on a step, end with "What did you do?". A full session
 * is a meal for the pet; stopping after 10+ minutes is a snack. The note goes into the journal.
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { journalEntries, pomodoroSessions, userSettings } from '$lib/server/db/schema';
import { feedQuietly, type FeedResult } from '$lib/server/features/pet/service';
import { recordEvent } from '$lib/server/features/experiments/service';
import { ownedSteps } from '$lib/server/features/plan/context';

type Platform = App.Platform | undefined;
export type Session = typeof pomodoroSessions.$inferSelect;

/** Stopping after this long still counts (a snack). */
export const MIN_COUNTED_MINUTES = 10;

export async function focusMinutes(platform: Platform, userId: string): Promise<number> {
	const [row] = await withDb(platform, (db) =>
		db
			.select({ minutes: userSettings.pomodoroFocusMin })
			.from(userSettings)
			.where(eq(userSettings.userId, userId))
	);
	return row?.minutes ?? 25;
}

export type StartResult =
	| { status: 'started'; session: Session; minutes: number }
	| { status: 'invalid'; message: string };

/** Starts a session (one at a time: an open one is closed without food). */
export async function startSession(
	platform: Platform,
	userId: string,
	stepId?: string
): Promise<StartResult> {
	if (stepId) {
		const owned = await withDb(platform, (db) => ownedSteps(db, userId, [stepId]));
		if (!owned.length) return { status: 'invalid', message: 'No step with that id' };
	}
	const minutes = await focusMinutes(platform, userId);
	const session = await withDb(platform, async (db) => {
		await db
			.update(pomodoroSessions)
			.set({ endedAt: new Date(), completed: false })
			.where(and(eq(pomodoroSessions.userId, userId), isNull(pomodoroSessions.endedAt)));
		const [row] = await db
			.insert(pomodoroSessions)
			.values({ userId, stepId: stepId ?? null })
			.returning();
		return row;
	});
	return { status: 'started', session, minutes };
}

export type EndResult =
	| {
			status: 'ended';
			session: Session;
			minutes: number;
			/** Full session or 10+ minutes: what the pet got. */
			fed: FeedResult | null;
	  }
	| { status: 'not_found' };

/** Ends a session; the length decides the food, and the note becomes a journal entry. */
export async function endSession(
	platform: Platform,
	userId: string,
	sessionId: string,
	note?: string
): Promise<EndResult> {
	const target = await focusMinutes(platform, userId);
	const ended = await withDb(platform, async (db) => {
		const [open] = await db
			.select()
			.from(pomodoroSessions)
			.where(and(eq(pomodoroSessions.id, sessionId), eq(pomodoroSessions.userId, userId)));
		if (!open) return null;
		const endedAt = open.endedAt ?? new Date();
		const minutes = Math.floor((endedAt.getTime() - open.startedAt.getTime()) / 60_000);
		const completed = minutes >= target;
		const [row] = await db
			.update(pomodoroSessions)
			.set({ endedAt, completed, note: note ?? open.note })
			.where(eq(pomodoroSessions.id, sessionId))
			.returning();
		if (note) {
			await db.insert(journalEntries).values({
				userId,
				stepId: open.stepId,
				kind: 'entry',
				body: note,
				source: 'pomodoro'
			});
		}
		return { row, minutes, wasOpen: !open.endedAt };
	});
	if (!ended) return { status: 'not_found' };

	const size = ended.row.completed ? 'meal' : ended.minutes >= MIN_COUNTED_MINUTES ? 'snack' : null;
	const fed =
		size && ended.wasOpen
			? await feedQuietly(platform, userId, { type: 'pomodoro', id: sessionId }, size)
			: null;
	if (ended.wasOpen) await recordEvent(platform, userId, 'pomodoro', { minutes: ended.minutes });
	return { status: 'ended', session: ended.row, minutes: ended.minutes, fed };
}

/** The open session, if any (for resuming the timer after a reload). */
export async function openSession(platform: Platform, userId: string) {
	const [row] = await withDb(platform, (db) =>
		db
			.select()
			.from(pomodoroSessions)
			.where(and(eq(pomodoroSessions.userId, userId), isNull(pomodoroSessions.endedAt)))
			.orderBy(desc(pomodoroSessions.startedAt))
			.limit(1)
	);
	return row ?? null;
}
