/** Reshuffle and fit-it-in rules, kept free of the database so they're easy to test. */
import { addDays, weekStart, weekdayName } from './dates';

/** A day with this many blocks is full when suggesting new slots. */
export const MAX_BLOCKS_PER_DAY = 3;
/** How close (cosine) a new idea must be to a goal to count as related. Tune from live use. */
export const MIN_SIMILARITY = 0.3;

/**
 * A new day for each missed block, in order: the first day from `from` with room, over a week.
 * `load` counts blocks already planned per day and is updated as days are handed out.
 * When the week is full, the block goes to the day after it.
 */
export function suggestDays(count: number, load: Map<string, number>, from: string): string[] {
	const days: string[] = [];
	for (let i = 0; i < count; i++) {
		let day = from;
		let offset = 0;
		while (offset < 7 && (load.get(day) ?? 0) >= MAX_BLOCKS_PER_DAY) day = addDays(from, ++offset);
		load.set(day, (load.get(day) ?? 0) + 1);
		days.push(day);
	}
	return days;
}

/** Never miss twice applies when yesterday had blocks and none of them got done. */
export function missedYesterday(blocks: { done: boolean }[]): boolean {
	return blocks.length > 0 && blocks.every((b) => !b.done);
}

/** Where to park an idea: the day after the related item's last planned block, else next Monday. */
export function parkDay(relatedDays: string[], today: string): string {
	if (relatedDays.length === 0) return addDays(weekStart(today), 7);
	return addDays([...relatedDays].sort().at(-1)!, 1);
}

/** "Tue–Thu" for a run of days, "Tue, Thu" otherwise. */
export function daysLabel(days: string[]): string {
	const sorted = [...new Set(days)].sort();
	if (sorted.length === 0) return '';
	const consecutive = sorted.every((d, i) => i === 0 || addDays(sorted[i - 1], 1) === d);
	if (consecutive && sorted.length > 2) {
		return `${weekdayName(sorted[0])}–${weekdayName(sorted.at(-1)!)}`;
	}
	return sorted.map(weekdayName).join(', ');
}

export function cosine(a: number[], b: number[]): number {
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
