/**
 * Planning periods, longest first. Each period's goals are the shortlist for the one below it
 * (year → half → quarter → month → week). Add one (a season, a semester) with a single entry here;
 * it's stored as a text id, so no migration is needed (Code layout rule 8).
 */
import { addDays, monthName, monthStart, nextMonthStart, weekStart } from './dates';

export interface PlanPeriod {
	label: string;
	/** Planned through /api/plan/periods/[kind]; month and week have their own flows. */
	generic: boolean;
	maxGoals: number;
	/** Whose goals make this period's shortlist. */
	parent: string | null;
	/** Also asks for themes and who they want to become (the year). */
	themes: boolean;
	/** Asked about the period that just ended. */
	reviewQuestions: string[];
	startOf(day: string): string;
	nextStart(day: string): string;
	/** "2026", "H2 2026", "Q4 2026", "November 2026", "Week of 2026-11-02". */
	name(day: string): string;
}

const year = (day: string) => Number(day.slice(0, 4));
const month = (day: string) => Number(day.slice(5, 7));
const iso = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-01`;
/** The first day of the `size`-month block (half = 6, quarter = 3) that `day` falls in. */
const blockStart = (day: string, size: number) =>
	iso(year(day), Math.floor((month(day) - 1) / size) * size + 1);
const blockNext = (day: string, size: number) => {
	const start = month(blockStart(day, size)) + size;
	return start > 12 ? iso(year(day) + 1, start - 12) : iso(year(day), start);
};

export const PLAN_PERIODS = {
	year: {
		label: 'Year',
		generic: true,
		maxGoals: 3,
		parent: null,
		themes: true,
		reviewQuestions: [
			'What went well this year?',
			"What didn't go so well?",
			'What did you learn?',
			'Did you live by what matters to you? (your integrity report)'
		],
		startOf: (day) => iso(year(day), 1),
		nextStart: (day) => iso(year(day) + 1, 1),
		name: (day) => String(year(day))
	},
	half: {
		label: 'Half-year',
		generic: true,
		maxGoals: 3,
		parent: 'year',
		themes: false,
		reviewQuestions: ['Halfway: are these still the right goals?', 'What moved, and what stalled?'],
		startOf: (day) => blockStart(day, 6),
		nextStart: (day) => blockNext(day, 6),
		name: (day) => `H${month(day) <= 6 ? 1 : 2} ${year(day)}`
	},
	quarter: {
		label: 'Quarter',
		generic: true,
		maxGoals: 3,
		parent: 'half',
		themes: false,
		reviewQuestions: ['What got done in these 12 weeks?', 'What carries over to next quarter?'],
		startOf: (day) => blockStart(day, 3),
		nextStart: (day) => blockNext(day, 3),
		name: (day) => `Q${Math.floor((month(day) - 1) / 3) + 1} ${year(day)}`
	},
	month: {
		label: 'Month',
		generic: false,
		maxGoals: 3,
		parent: 'quarter',
		themes: false,
		reviewQuestions: ['What moved?', 'What did you learn?', 'Anything to let go?'],
		startOf: monthStart,
		nextStart: nextMonthStart,
		name: monthName
	},
	week: {
		label: 'Week',
		generic: false,
		maxGoals: 21,
		parent: 'month',
		themes: false,
		reviewQuestions: [],
		startOf: weekStart,
		nextStart: (day) => addDays(weekStart(day), 7),
		name: (day) => `Week of ${weekStart(day)}`
	}
} as const satisfies Record<string, PlanPeriod>;

export type PeriodId = keyof typeof PLAN_PERIODS;

export function isPeriodId(value: unknown): value is PeriodId {
	return typeof value === 'string' && value in PLAN_PERIODS;
}

/** The period's first day, its last day, and its name, for a given day. */
export function periodOf(kind: PeriodId, day: string) {
	const period: PlanPeriod = PLAN_PERIODS[kind];
	const startsOn = period.startOf(day);
	return { startsOn, endsOn: addDays(period.nextStart(day), -1), name: period.name(day) };
}
