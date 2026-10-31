import { describe, expect, it } from 'vitest';
import { cosine, daysLabel, missedYesterday, parkDay, suggestDays } from './rules';

describe('suggestDays', () => {
	it('gives each missed block the first day with room', () => {
		const load = new Map([
			['2026-11-03', 3],
			['2026-11-04', 2]
		]);
		expect(suggestDays(3, load, '2026-11-03')).toEqual(['2026-11-04', '2026-11-05', '2026-11-05']);
	});

	it('spills past a full week', () => {
		const load = new Map(Array.from({ length: 7 }, (_, i) => [`2026-11-0${i + 2}`, 3]));
		expect(suggestDays(1, load, '2026-11-02')).toEqual(['2026-11-09']);
	});
});

describe('missedYesterday', () => {
	it('applies only when yesterday had blocks and none were done', () => {
		expect(missedYesterday([{ done: false }, { done: false }])).toBe(true);
		expect(missedYesterday([{ done: false }, { done: true }])).toBe(false);
		expect(missedYesterday([])).toBe(false);
	});
});

describe('parkDay', () => {
	it('parks until the day after the related item’s last block, else next Monday', () => {
		expect(parkDay(['2026-11-03', '2026-11-05'], '2026-11-02')).toBe('2026-11-06');
		expect(parkDay([], '2026-11-04')).toBe('2026-11-09');
	});
});

describe('daysLabel', () => {
	it('reads runs as a range', () => {
		expect(daysLabel(['2026-11-05', '2026-11-03', '2026-11-04'])).toBe('Tue–Thu');
		expect(daysLabel(['2026-11-03', '2026-11-05'])).toBe('Tue, Thu');
	});
});

describe('cosine', () => {
	it('scores direction, not length', () => {
		expect(cosine([1, 0], [2, 0])).toBeCloseTo(1);
		expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
		expect(cosine([], [])).toBe(0);
	});
});
