/** Spaced review (Breakdown §9): Got it climbs the ladder, Shaky repeats, Forgot starts over. */

export type Rating = 'got_it' | 'shaky' | 'forgot';

/** Days until the next review. */
export const LADDER = [1, 3, 7, 14, 30, 60] as const;

export function nextInterval(current: number, rating: Rating): number {
	if (rating === 'forgot') return 1;
	if (rating === 'shaky') return current;
	return LADDER.find((days) => days > current) ?? LADDER.at(-1)!;
}

/** Cards from different items take turns, so a review mixes topics (interleaving). */
export function interleave<T extends { itemId: string | null }>(cards: T[], limit: number): T[] {
	const byItem = new Map<string, T[]>();
	for (const card of cards) {
		const key = card.itemId ?? 'none';
		byItem.set(key, [...(byItem.get(key) ?? []), card]);
	}
	const queues = [...byItem.values()];
	const mixed: T[] = [];
	for (let round = 0; mixed.length < limit && queues.some((q) => q.length > round); round++) {
		for (const queue of queues) {
			if (queue[round] && mixed.length < limit) mixed.push(queue[round]);
		}
	}
	return mixed;
}
