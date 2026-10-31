import { describe, expect, it } from 'vitest';
import { readPick } from './prompt';

describe('readPick', () => {
	it('keeps a valid pick and only real memory numbers', () => {
		const pick = readPick(
			{
				itemId: 'b',
				reason: ' You wanted this month. ',
				firstStep: 'Play C major 7',
				twoMinuteStart: 'Open the keyboard app',
				memoriesUsed: [1, 2, 2, 9, 'x']
			},
			['a', 'b'],
			2
		);
		expect(pick).toEqual({
			itemId: 'b',
			reason: 'You wanted this month.',
			firstStep: 'Play C major 7',
			twoMinuteStart: 'Open the keyboard app',
			memoriesUsed: [1, 2]
		});
	});

	it('rejects an item id that is not a candidate', () => {
		expect(readPick({ itemId: 'made-up' }, ['a', 'b'], 0)).toBeNull();
	});
});
