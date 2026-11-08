import { describe, expect, it } from 'vitest';
import { busyFromIcs, icsFeed } from './ics';

const ICS = [
	'BEGIN:VCALENDAR',
	'BEGIN:VEVENT',
	'DTSTART:20261109T090000Z',
	'DTEND:20261109T100000Z',
	'SUMMARY:Standup with a long title that',
	'  wraps onto the next line',
	'END:VEVENT',
	'BEGIN:VEVENT',
	'DTSTART;TZID=Africa/Lagos:20261110T140000',
	'DTEND;TZID=Africa/Lagos:20261110T150000',
	'RRULE:FREQ=WEEKLY;BYDAY=TU,TH',
	'EXDATE;TZID=Africa/Lagos:20261112T140000',
	'END:VEVENT',
	'BEGIN:VEVENT',
	'DTSTART;VALUE=DATE:20261111',
	'DTEND;VALUE=DATE:20261112',
	'SUMMARY:Holiday (all day: not busy)',
	'END:VEVENT',
	'BEGIN:VEVENT',
	'DTSTART:20261111T120000Z',
	'DTEND:20261111T130000Z',
	'TRANSP:TRANSPARENT',
	'END:VEVENT',
	'BEGIN:VEVENT',
	'DTSTART:20261111T160000Z',
	'DTEND:20261111T170000Z',
	'STATUS:CANCELLED',
	'END:VEVENT',
	'END:VCALENDAR'
].join('\r\n');

describe('ICS busy times', () => {
	it('reads timed events, expands weekly repeats, and skips the rest', () => {
		const busy = busyFromIcs(
			ICS,
			new Date('2026-11-08T00:00:00Z'),
			new Date('2026-11-22T00:00:00Z'),
			'UTC'
		).map((b) => b.startsAt.toISOString());
		expect(busy).toEqual([
			'2026-11-09T09:00:00.000Z',
			'2026-11-10T13:00:00.000Z', // Tue 14:00 Lagos
			// Thu 12 Nov is an exception
			'2026-11-17T13:00:00.000Z',
			'2026-11-19T13:00:00.000Z'
		]);
	});

	it('writes a feed with alerts', () => {
		const feed = icsFeed('createthings', [
			{
				uid: 'slot-1',
				startsAt: new Date('2026-11-09T07:00:00Z'),
				minutes: 25,
				title: 'Chord shapes, drop-2',
				description: 'I will spend 25 minutes on chord shapes',
				location: null
			}
		]);
		expect(feed).toContain('DTSTART:20261109T070000Z');
		expect(feed).toContain('DTEND:20261109T072500Z');
		expect(feed).toContain('SUMMARY:Chord shapes\\, drop-2');
		expect(feed).toContain('TRIGGER:-PT10M');
	});
});
