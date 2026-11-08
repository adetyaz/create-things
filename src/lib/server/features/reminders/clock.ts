/** Wall-clock times in the user's timezone, for reminders (no date library needed). */

/** "HH:MM" (or "HH:MM:SS") → minutes since midnight. */
export function minutesOf(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + (m || 0);
}

/** The local day ("2026-11-08") and minutes since midnight in `timezone`. */
export function localNow(timezone: string, now = new Date()): { day: string; minutes: number } {
	try {
		const parts = new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		}).formatToParts(now);
		const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
		return {
			day: `${get('year')}-${get('month')}-${get('day')}`,
			minutes: Number(get('hour')) * 60 + Number(get('minute'))
		};
	} catch {
		const iso = now.toISOString();
		return { day: iso.slice(0, 10), minutes: now.getUTCHours() * 60 + now.getUTCMinutes() };
	}
}

/** The moment a local day + "HH:MM" happens in `timezone`, as a Date. */
export function zonedTime(day: string, time: string, timezone: string): Date {
	const guess = new Date(`${day}T${time.slice(0, 5)}:00Z`);
	// The zone's offset at that moment: what the local clock reads when UTC reads `guess`.
	const local = localNow(timezone, guess);
	const localAsUtc = Date.parse(`${local.day}T00:00:00Z`) + local.minutes * 60_000;
	return new Date(guess.getTime() - (localAsUtc - guess.getTime()));
}

/** True when `minutes` falls in quiet hours (which may wrap past midnight, e.g. 22:00–08:00). */
export function inQuietHours(minutes: number, quietStart: string, quietEnd: string): boolean {
	const start = minutesOf(quietStart);
	const end = minutesOf(quietEnd);
	return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}
