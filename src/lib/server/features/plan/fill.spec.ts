import { describe, expect, it } from 'vitest';
import { fillBlocks, intention, type StepOption } from './fill';

const step = (itemId: string, n: number): StepOption => ({
	id: `${itemId}-${n}`,
	title: `Step ${n} of ${itemId}`,
	minutes: 25,
	twoMinute: null,
	itemId,
	itemTitle: itemId
});

describe('fillBlocks', () => {
	it('fills blocks in time order, taking turns between goals', () => {
		const filled = fillBlocks(
			[
				{ day: '2026-11-04', startTime: '08:00' },
				{ day: '2026-11-03', anchor: 'after coffee' },
				{ day: '2026-11-03', startTime: '07:00' },
				{ day: '2026-11-05', startTime: '08:00' }
			],
			[[step('a', 1), step('a', 2), step('a', 3)], [step('b', 1)]]
		);
		expect(filled.map((b) => b.step?.id)).toEqual(['a-1', 'b-1', 'a-2', 'a-3']);
		expect(filled[1].anchor).toBe('after coffee');
	});

	it('leaves blocks empty when the steps run out', () => {
		const filled = fillBlocks([{ day: '2026-11-03' }, { day: '2026-11-04' }], [[step('a', 1)], []]);
		expect(filled.map((b) => b.step?.id ?? null)).toEqual(['a-1', null]);
		expect(filled[1].intention).toBeNull();
	});
});

describe('intention', () => {
	it('reads as "I will … on <day> at <time> at <place>"', () => {
		expect(
			intention(
				{ day: '2026-11-03', startTime: '08:00:00', place: 'my desk' },
				'Sketch three logos'
			)
		).toBe('I will sketch three logos on Tue at 08:00 at my desk');
		expect(intention({ day: '2026-11-03', anchor: 'after coffee' }, 'Read chapter 1')).toBe(
			'I will read chapter 1 on Tue after coffee'
		);
	});
});
