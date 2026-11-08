/**
 * Check-in rhythm: how often someone reports on their work (daily, every N days, weekly, chosen
 * days). Set by the user's template, editable, and overridable per goal (design PRD B10).
 */
import { z } from 'zod';
import { addDays, weekdayOf } from '$lib/server/features/plan/dates';

export const rhythmSchema = z.object({
	every: z.enum(['daily', 'days', 'weekly', 'weekdays']),
	/** For "days": every n days (2–14). */
	n: z.number().int().min(2).max(14).optional(),
	/** For "weekly" (first one) and "weekdays": 0 = Sunday … 6 = Saturday. */
	weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
	/** When the check-in is asked for, "HH:MM". */
	time: z.string().regex(/^\d{2}:\d{2}$/)
});

export type Rhythm = z.infer<typeof rhythmSchema>;

export const DEFAULT_RHYTHM: Rhythm = { every: 'daily', time: '19:00' };

function daysBetween(from: string, to: string): number {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Whether `day` is a check-in day, given the last day a check-in was made (or null). */
export function isCheckInDay(rhythm: Rhythm, day: string, lastCheckIn: string | null): boolean {
	if (lastCheckIn === day) return false;
	switch (rhythm.every) {
		case 'daily':
			return true;
		case 'days':
			return !lastCheckIn || daysBetween(lastCheckIn, day) >= (rhythm.n ?? 2);
		case 'weekly':
			return weekdayOf(day) === (rhythm.weekdays?.[0] ?? 0);
		case 'weekdays':
			return (rhythm.weekdays ?? []).includes(weekdayOf(day));
	}
}

/** The longest gap between check-ins this rhythm expects, in days (hunger in check-ins, Q6). */
export function rhythmGapDays(rhythm: Rhythm): number {
	switch (rhythm.every) {
		case 'daily':
			return 1;
		case 'days':
			return rhythm.n ?? 2;
		case 'weekly':
			return 7;
		case 'weekdays': {
			const days = [...new Set(rhythm.weekdays ?? [])].sort();
			if (days.length < 2) return 7;
			const gaps = days.map((d, i) => (i ? d - days[i - 1] : d + 7 - days[days.length - 1]));
			return Math.max(...gaps);
		}
	}
}

/** "every day at 19:00", "every 2 days at 19:00", "Mon, Thu at 07:30". */
export function describeRhythm(rhythm: Rhythm): string {
	const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const when =
		rhythm.every === 'daily'
			? 'every day'
			: rhythm.every === 'days'
				? `every ${rhythm.n ?? 2} days`
				: rhythm.every === 'weekly'
					? `every ${names[rhythm.weekdays?.[0] ?? 0]}`
					: (rhythm.weekdays ?? []).map((d) => names[d]).join(', ');
	return `${when} at ${rhythm.time}`;
}

/** The next check-in day on or after `from` (for "next check-in" in the UI). */
export function nextCheckInDay(rhythm: Rhythm, from: string, lastCheckIn: string | null): string {
	for (let i = 0; i < 15; i++) {
		const day = addDays(from, i);
		if (isCheckInDay(rhythm, day, lastCheckIn)) return day;
	}
	return from;
}
