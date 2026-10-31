/**
 * What AI actions cost. Example numbers from the Breakdown (Monetisation) until real prices are set
 * from measured AI costs (todolist #84).
 */

export const ACTION_COSTS = {
	analysis: 2,
	roadmap: 5,
	replan: 3,
	course: 3,
	petChat: 1,
	pick: 1,
	stuck: 1,
	teach: 1,
	cards: 1,
	explain: 1
} as const;

export const TIER_MULTIPLIERS = { basic: 1, plus: 3, pro: 10 } as const;

export type AiAction = keyof typeof ACTION_COSTS;
export type Tier = keyof typeof TIER_MULTIPLIERS;

export const DEFAULT_FREE_DAILY_CREDITS = 20;
/** Local development runs on free AI, so the meter stays out of the way while testing. */
export const LOCAL_FREE_DAILY_CREDITS = 1000;

export function costOf(action: AiAction, tier: Tier = 'basic'): number {
	return ACTION_COSTS[action] * TIER_MULTIPLIERS[tier];
}

/** The free quota only ever covers Basic-tier calls. */
export function freeQuotaApplies(tier: Tier): boolean {
	return tier === 'basic';
}

/** The quota day, as YYYY-MM-DD in UTC (the user's own timezone later). */
export function quotaDay(now: Date = new Date()): string {
	return now.toISOString().slice(0, 10);
}
