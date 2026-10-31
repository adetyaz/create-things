/** Turns a model's reading of a syllabus into a clean course. Never throws on shape. */
import { isPracticeKindId, type PracticeKindId } from '$lib/server/features/intents/practice';

export interface CourseUnit {
	title: string;
	topics: string[];
	date: string | null;
}

export interface CourseData {
	title: string;
	provider: string | null;
	summary: string;
	practiceKind: PracticeKindId | null;
	goal: string | null;
	examDate: string | null;
	skills: string[];
	units: CourseUnit[];
}

/** Courses can be long (a uni module has 12+ weeks); this caps runaway replies. */
const MAX_UNITS = 40;

export function normalizeCourse(raw: Record<string, unknown>): CourseData {
	const kind = text(raw.practiceKind)
		.toLowerCase()
		.replace(/[\s-]+/g, '_');
	return {
		title: text(raw.title),
		provider: text(raw.provider) || null,
		summary: text(raw.summary),
		practiceKind: isPracticeKindId(kind) ? kind : null,
		goal: text(raw.goal) || null,
		examDate: isoDate(raw.examDate),
		skills: list(raw.skills).map(text).filter(Boolean).slice(0, 8),
		units: list(raw.units)
			.slice(0, MAX_UNITS)
			.map((u) => {
				const unit = (u ?? {}) as Record<string, unknown>;
				return {
					title: text(unit.title),
					topics: list(unit.topics).map(text).filter(Boolean).slice(0, 8),
					date: isoDate(unit.date)
				};
			})
			.filter((u) => u.title)
	};
}

function list(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function isoDate(value: unknown): string | null {
	const v = text(value);
	return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
}
