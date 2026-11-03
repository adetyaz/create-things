import { describe, expect, it } from 'vitest';
import { daysWithoutFood, fitsToday, moodFor, nextChange, stages } from './rules';

const DEFAULT = { runawayDays: 30, deathDays: 60 };
const DAY = 24 * 60 * 60 * 1000;

describe('pet rules', () => {
	it('uses the documented stages for the default timeline', () => {
		expect(stages(DEFAULT)).toEqual({ peckish: 3, hungry: 7, starving: 14, ranAway: 30, dead: 60 });
	});

	it('scales the stages to a stricter timeline', () => {
		expect(stages({ runawayDays: 10, deathDays: 21 })).toEqual({
			peckish: 1,
			hungry: 2,
			starving: 5,
			ranAway: 10,
			dead: 21
		});
	});

	it('moves through the moods as days pass', () => {
		expect(moodFor(0, DEFAULT)).toBe('happy');
		expect(moodFor(3, DEFAULT)).toBe('peckish');
		expect(moodFor(7, DEFAULT)).toBe('hungry');
		expect(moodFor(14, DEFAULT)).toBe('starving');
		expect(moodFor(30, DEFAULT)).toBe('ran_away');
		expect(moodFor(60, DEFAULT)).toBe('dead');
		expect(moodFor(40, DEFAULT, true)).toBe('resting');
	});

	it('says when the mood next changes', () => {
		expect(nextChange(1, DEFAULT)).toEqual({ mood: 'peckish', inDays: 2 });
		expect(nextChange(60, DEFAULT)).toBeNull();
	});

	it("doesn't count rest mode as days without food", () => {
		const now = new Date('2026-11-20T12:00:00Z');
		const lastFed = new Date(now.getTime() - 10 * DAY);
		const restEnded = new Date(now.getTime() - 2 * DAY);
		expect(daysWithoutFood(lastFed, null, now)).toBe(10);
		expect(daysWithoutFood(lastFed, restEnded, now)).toBe(2);
	});

	it('keeps to the daily limit', () => {
		expect(fitsToday(0, 'feast')).toBe(true);
		expect(fitsToday(9, 'meal')).toBe(true);
		expect(fitsToday(10, 'meal')).toBe(false);
	});
});
