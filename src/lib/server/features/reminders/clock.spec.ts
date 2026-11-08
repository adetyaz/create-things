import { describe, expect, it } from 'vitest';
import { inQuietHours, localNow, zonedTime } from './clock';
import { describeRhythm, isCheckInDay, rhythmGapDays } from '$lib/server/features/templates/rhythm';

describe('reminder clock', () => {
	it('reads the local day and time in a timezone', () => {
		const now = new Date('2026-11-08T22:30:00Z');
		expect(localNow('Africa/Lagos', now)).toEqual({ day: '2026-11-08', minutes: 23 * 60 + 30 });
		expect(localNow('Asia/Tokyo', now)).toEqual({ day: '2026-11-09', minutes: 7 * 60 + 30 });
	});

	it('turns a local time into the right moment', () => {
		expect(zonedTime('2026-11-08', '08:00', 'Africa/Lagos').toISOString()).toBe(
			'2026-11-08T07:00:00.000Z'
		);
		expect(zonedTime('2026-11-08', '08:00', 'UTC').toISOString()).toBe('2026-11-08T08:00:00.000Z');
	});

	it('handles quiet hours that wrap past midnight', () => {
		expect(inQuietHours(23 * 60, '22:00', '08:00')).toBe(true);
		expect(inQuietHours(7 * 60, '22:00', '08:00')).toBe(true);
		expect(inQuietHours(12 * 60, '22:00', '08:00')).toBe(false);
		expect(inQuietHours(13 * 60, '12:00', '14:00')).toBe(true);
	});
});

describe('check-in rhythm', () => {
	it('knows check-in days', () => {
		expect(isCheckInDay({ every: 'daily', time: '19:00' }, '2026-11-08', '2026-11-07')).toBe(true);
		expect(isCheckInDay({ every: 'daily', time: '19:00' }, '2026-11-08', '2026-11-08')).toBe(false);
		expect(isCheckInDay({ every: 'days', n: 2, time: '19:00' }, '2026-11-08', '2026-11-07')).toBe(
			false
		);
		expect(isCheckInDay({ every: 'days', n: 2, time: '19:00' }, '2026-11-09', '2026-11-07')).toBe(
			true
		);
		// 2026-11-08 is a Sunday.
		expect(isCheckInDay({ every: 'weekly', weekdays: [0], time: '10:00' }, '2026-11-08', null)).toBe(
			true
		);
		expect(
			isCheckInDay({ every: 'weekdays', weekdays: [1, 4], time: '07:30' }, '2026-11-08', null)
		).toBe(false);
	});

	it('knows the longest gap and describes itself', () => {
		expect(rhythmGapDays({ every: 'weekdays', weekdays: [1, 4], time: '07:30' })).toBe(4);
		expect(describeRhythm({ every: 'days', n: 2, time: '19:00' })).toBe('every 2 days at 19:00');
	});
});
