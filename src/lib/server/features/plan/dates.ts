/** Calendar days as YYYY-MM-DD strings, in the user's timezone. Weeks start on Monday. */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Today in `timezone` (falls back to UTC for an unknown zone). */
export function today(timezone: string, now: Date = new Date()): string {
	try {
		return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
	} catch {
		return now.toISOString().slice(0, 10);
	}
}

export function addDays(day: string, days: number): string {
	return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(day: string): number {
	return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export function weekdayName(day: string): string {
	return WEEKDAYS[weekdayOf(day)];
}

/** The Monday of `day`'s week. */
export function weekStart(day: string): string {
	return addDays(day, -((weekdayOf(day) + 6) % 7));
}

export function monthStart(day: string): string {
	return `${day.slice(0, 7)}-01`;
}

export function nextMonthStart(day: string): string {
	const [year, month] = day.split('-').map(Number);
	return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/** "November 2026". */
export function monthName(day: string): string {
	return new Date(`${monthStart(day)}T00:00:00Z`).toLocaleString('en-GB', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
}
