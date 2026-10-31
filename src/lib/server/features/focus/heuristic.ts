/**
 * The no-AI pick: best fit for the time and energy available, then whatever has waited longest.
 * Used when the AI fails or credits run out, so Pick for me always answers.
 */

export type Energy = 'low' | 'normal' | 'high';

export interface Candidate {
	id: string;
	title: string;
	size: 'afternoon' | 'weekend' | 'week' | 'month' | null;
	difficulty: 'easy' | 'medium' | 'hard' | null;
	savedAt: Date;
}

const SIZE_RANK = { afternoon: 0, weekend: 1, week: 2, month: 3 } as const;
const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 } as const;

/** Lower is a better fit. Unknown size or difficulty counts as middling. */
export function fitScore(candidate: Candidate, minutes: number, energy: Energy): number {
	const size = candidate.size ? SIZE_RANK[candidate.size] : 1.5;
	const difficulty = candidate.difficulty ? DIFFICULTY_RANK[candidate.difficulty] : 1;
	// Short sessions favour small things; low energy favours easy things; high energy doesn't mind.
	const sizeWeight = minutes <= 15 ? 2 : minutes <= 30 ? 1 : 0.5;
	const difficultyWeight = energy === 'low' ? 2 : energy === 'normal' ? 1 : 0;
	return size * sizeWeight + difficulty * difficultyWeight;
}

export function heuristicPick(
	candidates: Candidate[],
	minutes: number,
	energy: Energy
): Candidate | null {
	if (candidates.length === 0) return null;
	return [...candidates].sort(
		(a, b) =>
			fitScore(a, minutes, energy) - fitScore(b, minutes, energy) ||
			a.savedAt.getTime() - b.savedAt.getTime()
	)[0];
}
