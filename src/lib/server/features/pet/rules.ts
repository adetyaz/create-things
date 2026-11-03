/**
 * The pet's rules, without the database: food sizes, the daily limit, and hunger worked out from
 * the last meal (no nightly job). Breakdown §10 "Feeding" and "Hunger, running away and death".
 */

export type FoodSize = 'snack' | 'meal' | 'feast';
export type Mood = 'happy' | 'peckish' | 'hungry' | 'starving' | 'ran_away' | 'dead' | 'resting';

/** How much each size counts toward the daily limit and growth. */
export const FOOD_POINTS: Record<FoodSize, number> = { snack: 1, meal: 3, feast: 8 };

/** So one marathon day can't cover a week: about four steps' worth. */
export const DAILY_FOOD_LIMIT = 12;

/** Days of activity that bring a pet that ran away back home. */
export const DAYS_TO_COME_HOME = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Timeline {
	runawayDays: number;
	deathDays: number;
}

/**
 * When each hunger stage starts, in days without food. The defaults (3 / 7 / 14 for a 30-day
 * timeline) scale with the user's own timeline.
 */
export function stages({ runawayDays, deathDays }: Timeline) {
	return {
		peckish: Math.max(1, Math.round((runawayDays * 3) / 30)),
		hungry: Math.max(2, Math.round((runawayDays * 7) / 30)),
		starving: Math.max(3, Math.round((runawayDays * 14) / 30)),
		ranAway: runawayDays,
		dead: deathDays
	};
}

/** Whole days since the last meal; rest mode doesn't count (the clock restarts when rest ends). */
export function daysWithoutFood(lastFedAt: Date, restUntil: Date | null, now = new Date()): number {
	const from = restUntil && restUntil < now && restUntil > lastFedAt ? restUntil : lastFedAt;
	return Math.max(0, Math.floor((now.getTime() - from.getTime()) / DAY_MS));
}

/** The mood for a number of days without food, or "resting" while rest mode is on. */
export function moodFor(days: number, timeline: Timeline, resting = false): Mood {
	if (resting) return 'resting';
	const s = stages(timeline);
	if (days >= s.dead) return 'dead';
	if (days >= s.ranAway) return 'ran_away';
	if (days >= s.starving) return 'starving';
	if (days >= s.hungry) return 'hungry';
	if (days >= s.peckish) return 'peckish';
	return 'happy';
}

/** Days until the mood next gets worse ("gets peckish in 2 days"), or null when nothing is ahead. */
export function nextChange(
	days: number,
	timeline: Timeline
): { mood: Mood; inDays: number } | null {
	const s = stages(timeline);
	const ahead: [Mood, number][] = [
		['peckish', s.peckish],
		['hungry', s.hungry],
		['starving', s.starving],
		['ran_away', s.ranAway],
		['dead', s.dead]
	];
	const next = ahead.find(([, at]) => at > days);
	return next ? { mood: next[0], inDays: next[1] - days } : null;
}

/** How much of a feed fits under today's limit: the full size, or nothing. */
export function fitsToday(eatenToday: number, size: FoodSize): boolean {
	return eatenToday + FOOD_POINTS[size] <= DAILY_FOOD_LIMIT;
}

/** "today", "yesterday", "3 days ago". */
export function ago(days: number): string {
	return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}
