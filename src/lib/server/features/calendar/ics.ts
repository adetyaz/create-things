/**
 * Reading busy times from an ICS calendar, and writing the user's blocks as one. Only start and
 * end are kept from someone's calendar, never titles (Breakdown §2c). Repeating events (daily and
 * weekly, the common ones) are expanded; rarer rules are read as their first occurrence.
 */
import { zonedTime } from '$lib/server/features/reminders/clock';

export interface Busy {
	startsAt: Date;
	endsAt: Date;
}

/** RFC 5545 lines can wrap: a line starting with a space continues the one before. */
function unfold(text: string): string[] {
	return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
}

interface Prop {
	value: string;
	params: Record<string, string>;
}

function parseLine(line: string): [string, Prop] | null {
	const colon = line.indexOf(':');
	if (colon < 0) return null;
	const [name, ...params] = line.slice(0, colon).split(';');
	return [
		name.toUpperCase(),
		{
			value: line.slice(colon + 1),
			params: Object.fromEntries(
				params.map((p) => {
					const [k, v = ''] = p.split('=');
					return [k.toUpperCase(), v.replace(/^"|"$/g, '')];
				})
			)
		}
	];
}

/** A DTSTART / DTEND value as a moment; all-day dates return null (not counted as busy). */
function toDate(prop: Prop, fallbackZone: string): Date | null {
	const v = prop.value.trim();
	if (prop.params.VALUE === 'DATE' || /^\d{8}$/.test(v)) return null;
	const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
	if (!m) return null;
	const [, y, mo, d, h, mi, , z] = m;
	if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
	// A named zone (or floating time): use it when the runtime knows it, else the user's zone.
	const zone = prop.params.TZID && knownZone(prop.params.TZID) ? prop.params.TZID : fallbackZone;
	return zonedTime(`${y}-${mo}-${d}`, `${h}:${mi}`, zone);
}

function knownZone(zone: string): boolean {
	try {
		new Intl.DateTimeFormat('en', { timeZone: zone });
		return true;
	} catch {
		return false;
	}
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Occurrences of a repeating event that start inside [from, to). */
function expand(start: Date, end: Date, rrule: string, exdates: Set<number>, from: Date, to: Date) {
	const rule = Object.fromEntries(
		rrule.split(';').map((part) => {
			const [k, v] = part.split('=');
			return [k.toUpperCase(), v];
		})
	);
	const length = end.getTime() - start.getTime();
	const interval = Math.max(1, Number(rule.INTERVAL ?? 1));
	const until = rule.UNTIL ? toDate({ value: rule.UNTIL, params: {} }, 'UTC') : null;
	const maxCount = rule.COUNT ? Number(rule.COUNT) : Infinity;
	const out: Busy[] = [];
	if (rule.FREQ !== 'DAILY' && rule.FREQ !== 'WEEKLY') {
		if (start < to && start >= from) out.push({ startsAt: start, endsAt: end });
		return out;
	}
	const byDay = rule.BYDAY
		? rule.BYDAY.split(',').map((d: string) => WEEKDAYS.indexOf(d.slice(-2)))
		: [start.getUTCDay()];
	let count = 0;
	// Walk day by day from the first start; cheap for a 2-week window.
	for (let t = start.getTime(); t < to.getTime(); t += DAY_MS) {
		if (until && t > until.getTime()) break;
		if (count >= maxCount) break;
		const day = new Date(t);
		const daysSince = Math.round((t - start.getTime()) / DAY_MS);
		const matches =
			rule.FREQ === 'DAILY'
				? daysSince % interval === 0
				: byDay.includes(day.getUTCDay()) && Math.floor(daysSince / 7) % interval === 0;
		if (!matches) continue;
		count++;
		if (exdates.has(t) || t < from.getTime()) continue;
		out.push({ startsAt: day, endsAt: new Date(t + length) });
	}
	return out;
}

/**
 * Busy times in [from, to) from an ICS file. Skips cancelled events, free ("transparent") ones and
 * all-day events.
 */
export function busyFromIcs(text: string, from: Date, to: Date, fallbackZone: string): Busy[] {
	const busy: Busy[] = [];
	let event: Map<string, Prop[]> | null = null;
	for (const raw of unfold(text)) {
		const line = raw.trim();
		if (line === 'BEGIN:VEVENT') {
			event = new Map();
			continue;
		}
		if (line === 'END:VEVENT' && event) {
			const one = (k: string) => event!.get(k)?.[0];
			const status = one('STATUS')?.value.toUpperCase();
			const transp = one('TRANSP')?.value.toUpperCase();
			const startProp = one('DTSTART');
			const start = startProp ? toDate(startProp, fallbackZone) : null;
			const endProp = one('DTEND');
			const end = endProp
				? toDate(endProp, fallbackZone)
				: start
					? new Date(start.getTime() + 60 * 60_000)
					: null;
			if (start && end && status !== 'CANCELLED' && transp !== 'TRANSPARENT') {
				const rrule = one('RRULE')?.value;
				const exdates = new Set(
					(event.get('EXDATE') ?? []).flatMap((p) =>
						p.value
							.split(',')
							.map((v) => toDate({ value: v, params: p.params }, fallbackZone)?.getTime() ?? NaN)
					)
				);
				if (rrule) busy.push(...expand(start, end, rrule, exdates, from, to));
				else if (start < to && end > from) busy.push({ startsAt: start, endsAt: end });
			}
			event = null;
			continue;
		}
		if (!event) continue;
		const parsed = parseLine(line);
		if (!parsed) continue;
		const [name, prop] = parsed;
		event.set(name, [...(event.get(name) ?? []), prop]);
	}
	return busy.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** "20261108T070000Z" */
function icsTime(d: Date): string {
	return d
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');
}

/** Text values escape commas, semicolons and backslashes; long lines fold at 75 octets. */
function text(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\n/g, '\\n');
}

function fold(line: string): string {
	const parts: string[] = [];
	for (let i = 0; i < line.length; i += 73) parts.push((i ? ' ' : '') + line.slice(i, i + 73));
	return parts.join('\r\n');
}

export interface FeedEvent {
	uid: string;
	startsAt: Date;
	minutes: number;
	title: string;
	description: string;
	location: string | null;
}

/** An ICS calendar of the user's blocks, each with a 10-minute alert (where the app honours it). */
export function icsFeed(name: string, events: FeedEvent[], now = new Date()): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//createthings//blocks//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${text(name)}`,
		'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
		'X-PUBLISHED-TTL:PT1H'
	];
	for (const e of events) {
		lines.push(
			'BEGIN:VEVENT',
			`UID:${e.uid}@createthings`,
			`DTSTAMP:${icsTime(now)}`,
			`DTSTART:${icsTime(e.startsAt)}`,
			`DTEND:${icsTime(new Date(e.startsAt.getTime() + e.minutes * 60_000))}`,
			`SUMMARY:${text(e.title)}`,
			`DESCRIPTION:${text(e.description)}`,
			...(e.location ? [`LOCATION:${text(e.location)}`] : []),
			'BEGIN:VALARM',
			'ACTION:DISPLAY',
			`DESCRIPTION:${text(e.title)}`,
			'TRIGGER:-PT10M',
			'END:VALARM',
			'END:VEVENT'
		);
	}
	lines.push('END:VCALENDAR');
	return lines.map(fold).join('\r\n') + '\r\n';
}
