/** Turns a model's roadmap reply into clean milestones and steps. Never throws on shape. */

export interface PlannedStep {
	title: string;
	minutes: number;
	twoMinute: string | null;
	searchTerms: string[];
	tools: string[];
	recall: string | null;
	recallAnswer: string | null;
	/** 'proof' for a proving ground at the end of a milestone. */
	kind: 'step' | 'proof';
}

export interface PlannedMilestone {
	title: string;
	steps: PlannedStep[];
}

export interface Resource {
	title: string;
	url: string | null;
}

export interface PlannedRoadmap {
	style: 'project' | 'skill';
	/** "By the end you'll be able to…" options, best first. */
	goalOptions: string[];
	skills: string[];
	resources: Resource[];
	milestones: PlannedMilestone[];
}

const MAX_MILESTONES = 6;
const MAX_STEPS = 6;
const MAX_PROOFS = 3;

export function normalizeRoadmap(
	raw: Record<string, unknown>,
	fallbackStyle: 'project' | 'skill'
): PlannedRoadmap {
	const milestones = list(raw.milestones)
		.slice(0, MAX_MILESTONES)
		.map((m) => {
			const milestone = (m ?? {}) as Record<string, unknown>;
			return {
				// Models sometimes number them ("Milestone 1: Basics"); the order already says that.
				title: text(milestone.title).replace(/^(milestone|step|phase)\s*\d+\s*[:.–-]\s*/i, ''),
				steps: [
					...list(milestone.steps)
						.slice(0, MAX_STEPS)
						.map((s) => step(s, 'step')),
					// Proving grounds close the milestone: real things that use what it taught.
					...list(milestone.provingGround)
						.slice(0, MAX_PROOFS)
						.map((s) => step(s, 'proof'))
				].filter((s) => s.title)
			};
		})
		.filter((m) => m.title && m.steps.some((s) => s.kind === 'step'));

	return {
		style: raw.style === 'skill' || raw.style === 'project' ? raw.style : fallbackStyle,
		goalOptions: [...new Set(list(raw.goalOptions).map(text).filter(Boolean))].slice(0, 3),
		skills: list(raw.skills).map(text).filter(Boolean).slice(0, 10),
		resources: list(raw.resources)
			.map((r) => {
				if (typeof r === 'string') return { title: r.trim(), url: null };
				const res = (r ?? {}) as Record<string, unknown>;
				const url = text(res.url);
				return { title: text(res.title), url: /^https?:\/\//i.test(url) ? url : null };
			})
			.filter((r) => r.title)
			.slice(0, 8),
		milestones
	};
}

function step(value: unknown, kind: PlannedStep['kind']): PlannedStep {
	const s = (value ?? {}) as Record<string, unknown>;
	const minutes = Number(s.minutes);
	return {
		title: text(s.title),
		// Steps are meant to be 15–30 minutes; clamp drift, default to 25.
		minutes: Number.isFinite(minutes) ? Math.min(45, Math.max(5, Math.round(minutes))) : 25,
		twoMinute: text(s.twoMinute) || null,
		searchTerms: list(s.searchTerms).map(text).filter(Boolean).slice(0, 4),
		tools: list(s.tools).map(text).filter(Boolean).slice(0, 4),
		recall: text(s.recall) || null,
		recallAnswer: text(s.recallAnswer).slice(0, 400) || null,
		kind
	};
}

function list(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * Course milestones are named after its units, in order, whatever the model called them. Extra
 * milestones (if the model split a unit) keep their own names.
 */
export function alignToUnits(milestones: PlannedMilestone[], units: string[]): PlannedMilestone[] {
	return milestones.map((m, i) => (i < units.length ? { ...m, title: units[i] } : m));
}
