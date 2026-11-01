/** Ranking what to do next after an item: skills in common, then closeness in meaning. Free. */
import { cosine } from '$lib/server/features/plan/rules';

export interface NextCandidate {
	id: string;
	title: string;
	skills: string[];
	summary: string | null;
}

/** Skills both items share, matched loosely ("CSS grid" ~ "css grid layout"). */
export function sharedSkills(finished: string[], candidate: string[]): string[] {
	const norm = (s: string) =>
		s
			.toLowerCase()
			.replace(/[^a-z0-9 ]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	const done = finished.map(norm).filter(Boolean);
	return candidate.filter((skill) => {
		const s = norm(skill);
		return s && done.some((d) => d === s || d.includes(s) || s.includes(d));
	});
}

/**
 * Best first: each shared skill counts 1, meaning closeness (0–1) counts up to 2, so a close
 * match with no listed skills can still rank.
 */
export function rankCandidates(
	finishedSkills: string[],
	candidates: NextCandidate[],
	vectors: Map<string, number[]> | null,
	finishedId: string
): (NextCandidate & { shared: string[]; score: number })[] {
	const mine = vectors?.get(finishedId);
	return (
		candidates
			.map((c) => {
				const shared = sharedSkills(finishedSkills, c.skills);
				const theirs = vectors?.get(c.id);
				const closeness = mine && theirs ? Math.max(0, cosine(mine, theirs)) : 0;
				return { ...c, shared, score: shared.length + closeness * 2 };
			})
			// Ties go to more shared skills: named skills carrying over is the point.
			.sort((a, b) => b.score - a.score || b.shared.length - a.shared.length)
	);
}
