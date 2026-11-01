import { describe, expect, it } from 'vitest';
import { interleave, nextInterval } from './schedule';

describe('nextInterval', () => {
	it('climbs 1 → 3 → 7 → 14 → 30 → 60 on Got it, and stays at 60', () => {
		const climb = [1, 3, 7, 14, 30, 60].map((d) => nextInterval(d, 'got_it'));
		expect(climb).toEqual([3, 7, 14, 30, 60, 60]);
	});

	it('repeats on Shaky and starts over on Forgot', () => {
		expect(nextInterval(14, 'shaky')).toBe(14);
		expect(nextInterval(30, 'forgot')).toBe(1);
	});
});

describe('interleave', () => {
	it('takes turns between items up to the limit', () => {
		const cards = [
			{ id: 'a1', itemId: 'a' },
			{ id: 'a2', itemId: 'a' },
			{ id: 'a3', itemId: 'a' },
			{ id: 'b1', itemId: 'b' },
			{ id: 'c1', itemId: null }
		];
		expect(interleave(cards, 4).map((c) => c.id)).toEqual(['a1', 'b1', 'c1', 'a2']);
	});
});
