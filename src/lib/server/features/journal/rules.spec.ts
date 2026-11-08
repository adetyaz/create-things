import { describe, expect, it } from 'vitest';
import { foodFor, matchItem, soundsLikeLearning } from './rules';
import { readCards } from './prompt';

describe('journal rules', () => {
	it('feeds by depth', () => {
		expect(foodFor('check_in', 'did 5 minutes on the chords')).toBe('snack');
		expect(foodFor('entry', 'short note')).toBe('snack');
		expect(foodFor('entry', 'word '.repeat(45))).toBe('meal');
	});

	it('finds what an entry is about from shared words', () => {
		const items = [
			{ id: 'a', title: 'Learn jazz piano chords', step: 'Shell voicings in C' },
			{ id: 'b', title: 'See if I like pottery', step: 'Wedging clay' }
		];
		expect(matchItem('practised shell voicings for 20 minutes', items)?.id).toBe('a');
		expect(matchItem('wedged the clay, still lumpy', items)?.id).toBe('b');
		expect(matchItem('went to the market', items)).toBeNull();
	});

	it('notices learning', () => {
		expect(soundsLikeLearning('Today I learned that the 7th sits on top')).toBe(true);
		expect(soundsLikeLearning('did 5 minutes')).toBe(false);
	});

	it('keeps at most 3 usable cards', () => {
		expect(
			readCards({
				cards: [
					{ prompt: 'Q1', answer: 'A1' },
					{ prompt: '', answer: 'x' },
					{ prompt: 'Q2', answer: 'A2' },
					{ prompt: 'Q3', answer: 'A3' },
					{ prompt: 'Q4', answer: 'A4' }
				]
			})
		).toHaveLength(3);
	});
});
