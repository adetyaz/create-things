import { describe, expect, it } from 'vitest';
import { heuristicPick, type Candidate } from './heuristic';

const at = (day: number) => new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00Z`);
const candidate = (
	id: string,
	size: Candidate['size'],
	difficulty: Candidate['difficulty'],
	day: number
): Candidate => ({
	id,
	title: id,
	size,
	difficulty,
	savedAt: at(day)
});

const pile = [
	candidate('big-hard', 'month', 'hard', 1),
	candidate('small-easy', 'afternoon', 'easy', 20),
	candidate('mid-medium', 'weekend', 'medium', 10)
];

describe('heuristicPick', () => {
	it('picks small and easy for a short, low-energy session', () => {
		expect(heuristicPick(pile, 15, 'low')?.id).toBe('small-easy');
	});

	it('breaks ties by picking what has waited longest', () => {
		const twins = [
			candidate('newer', 'weekend', 'easy', 20),
			candidate('older', 'weekend', 'easy', 5)
		];
		expect(heuristicPick(twins, 30, 'normal')?.id).toBe('older');
	});

	it('lets high energy and lots of time reach for harder things', () => {
		const choices = [
			candidate('hard-old', 'week', 'hard', 1),
			candidate('easy-new', 'week', 'easy', 25)
		];
		expect(heuristicPick(choices, 60, 'high')?.id).toBe('hard-old');
	});

	it('returns null when there is nothing to pick', () => {
		expect(heuristicPick([], 30, 'normal')).toBeNull();
	});
});
