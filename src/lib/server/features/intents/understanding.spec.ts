import { describe, expect, it } from 'vitest';
import { understandingOf } from './understanding';

const item = {
	id: 'i1',
	title: 'Learn to play jazz piano chords',
	intent: 'learn',
	practiceKind: 'body',
	goal: 'Play Autumn Leaves with shell voicings.',
	targetDate: null,
	intentConfirmedAt: null
};

describe('understandingOf', () => {
	it('says what the app understood, in the pet’s words', () => {
		const card = understandingOf(item);
		expect(card.message).toBe(
			'Looks like you want to learn a skill: Learn to play jazz piano chords. Goal: Play Autumn Leaves with shell voicings. Right?'
		);
		expect(card.intent).toEqual({ id: 'learn', label: 'Learn a skill' });
		expect(card.practiceKind?.label).toBe('Body and hands');
		expect(card.confirmed).toBe(false);
	});

	it('mentions a date and offers every choice', () => {
		const card = understandingOf({ ...item, intent: 'course', targetDate: '2026-12-12' });
		expect(card.message).toContain('By 2026-12-12.');
		expect(card.choices.intents.map((i) => i.id)).toContain('habit');
		expect(card.choices.practiceKinds.map((k) => k.id)).toContain('real_world');
	});
});
