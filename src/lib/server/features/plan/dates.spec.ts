import { describe, expect, it } from 'vitest';
import { addDays, monthName, nextMonthStart, today, weekStart, weekdayName } from './dates';

describe('plan dates', () => {
	it('reads today in the user timezone', () => {
		const lateUtc = new Date('2026-10-31T23:30:00Z');
		expect(today('UTC', lateUtc)).toBe('2026-10-31');
		expect(today('Africa/Lagos', lateUtc)).toBe('2026-11-01');
		expect(today('Not/AZone', lateUtc)).toBe('2026-10-31');
	});

	it('does week and month math', () => {
		expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
		expect(weekStart('2026-11-01')).toBe('2026-10-26'); // a Sunday belongs to the week before
		expect(weekStart('2026-11-02')).toBe('2026-11-02');
		expect(weekdayName('2026-11-03')).toBe('Tue');
		expect(nextMonthStart('2026-12-15')).toBe('2027-01-01');
		expect(monthName('2026-11-20')).toBe('November 2026');
	});
});
