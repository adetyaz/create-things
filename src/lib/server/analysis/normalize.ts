/** Turns a model's JSON reply into a clean, typed analysis. Models drift; this never throws on shape. */

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
	isLearningGoal: boolean;
}

/** Finds the JSON object in a reply that may be wrapped in prose or ``` fences. */
export function extractJson(reply: unknown): Record<string, unknown> {
	if (reply && typeof reply === 'object') return reply as Record<string, unknown>;
	if (typeof reply !== 'string') throw new Error('Model reply was empty');

	const start = reply.indexOf('{');
	const end = reply.lastIndexOf('}');
	if (start < 0 || end <= start) throw new Error('Model reply had no JSON object');
	return JSON.parse(reply.slice(start, end + 1));
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
		isLearningGoal: raw.isLearningGoal === true || raw.isLearningGoal === 'true'
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
