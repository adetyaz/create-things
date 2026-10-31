/** Turns a model's JSON reply into a clean, typed analysis. Models drift; this never throws on shape. */
import { DEFAULT_INTENT, isIntentId, type IntentId } from '$lib/server/features/intents/registry';
import { isPracticeKindId, type PracticeKindId } from '$lib/server/features/intents/practice';

export const SIZES = ['afternoon', 'weekend', 'week', 'month'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type ItemSize = (typeof SIZES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface AnalysisData {
	title: string | null;
	summary: string;
	technique: string;
	colors: string;
	typography: string;
	layout: string;
	mood: string[];
	style: string;
	components: string;
	forDevelopers: string;
	forCreators: string;
	brief: string;
	skills: string[];
	size: ItemSize | null;
	difficulty: Difficulty | null;
	intent: IntentId;
	practiceKind: PracticeKindId | null;
	goal: string | null;
	targetDate: string | null;
}

export function normalizeAnalysis(raw: Record<string, unknown>): AnalysisData {
	return {
		title: text(raw.title) || null,
		summary: text(raw.summary),
		technique: text(raw.technique),
		colors: text(raw.colors),
		typography: text(raw.typography),
		layout: text(raw.layout),
		mood: list(raw.mood).slice(0, 5),
		style: text(raw.style),
		components: text(raw.components),
		forDevelopers: text(raw.forDevelopers),
		forCreators: text(raw.forCreators),
		brief: text(raw.brief),
		skills: list(raw.skills).slice(0, 8),
		size: oneOf(raw.size, SIZES),
		difficulty: oneOf(raw.difficulty, DIFFICULTIES),
		intent: oneOfIds(raw.intent, isIntentId) ?? DEFAULT_INTENT,
		practiceKind: oneOfIds(raw.practiceKind, isPracticeKindId),
		goal: text(raw.goal) || null,
		targetDate: isoDate(raw.targetDate)
	};
}

function text(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
	return '';
}

function list(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(text).filter(Boolean);
	if (typeof value === 'string')
		return value
			.split(/[,\n]/)
			.map((s) => s.trim())
			.filter(Boolean);
	return [];
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
	const v = text(value).toLowerCase();
	return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

function oneOfIds<T extends string>(value: unknown, is: (v: unknown) => v is T): T | null {
	const v = text(value)
		.toLowerCase()
		.replace(/[\s-]+/g, '_');
	return is(v) ? v : null;
}

function isoDate(value: unknown): string | null {
	const v = text(value);
	return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
}
