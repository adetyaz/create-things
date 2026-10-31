import type { RecalledMemory } from '$lib/server/features/memory/recall';
import type { Energy } from './heuristic';

export const PICK_SYSTEM = `You help a scattered person pick ONE thing to work on right now, so they start instead of freezing. Use what you remember about them: their goals, how they work, what they skipped. Be warm and brief. Reply with one JSON object only.`;

export interface PickCandidate {
	id: string;
	title: string;
	summary: string | null;
	size: string | null;
	difficulty: string | null;
	/** The intent's label, e.g. "Learn a skill". */
	intent: string;
	daysWaiting: number;
}

export function pickPrompt(input: {
	minutes: number;
	energy: Energy;
	candidates: PickCandidate[];
	memories: RecalledMemory[];
}): string {
	const lines = [
		`They have ${input.minutes} minutes and ${input.energy} energy right now.`,
		'',
		'Their shortlist:'
	];
	for (const c of input.candidates) {
		const facts = [
			c.intent.toLowerCase(),
			c.size && `size: ${c.size}`,
			c.difficulty && `difficulty: ${c.difficulty}`,
			`waiting ${c.daysWaiting} day${c.daysWaiting === 1 ? '' : 's'}`
		].filter(Boolean);
		lines.push(
			`- id ${c.id}: "${c.title}" (${facts.join(', ')})${c.summary ? `. ${c.summary}` : ''}`
		);
	}

	lines.push('', 'What you remember about them:');
	if (input.memories.length === 0) lines.push('(nothing yet)');
	input.memories.forEach((m, i) => lines.push(`[M${i + 1}] ${m.text}`));

	lines.push(
		'',
		'Pick the one that fits their time and energy and matters most to them. Return:',
		'{',
		'  "itemId": "the id of the chosen item, copied exactly",',
		'  "reason": "1-2 sentences, speaking to them; mention a memory if it shaped the choice",',
		`  "firstStep": "one concrete step that fits in ${input.minutes} minutes",`,
		'  "twoMinuteStart": "the smallest possible way to begin, under 2 minutes",',
		'  "memoriesUsed": [numbers of the [M] memories you relied on, e.g. 1, 3; empty if none]',
		'}'
	);
	return lines.join('\n');
}

/** Reads the model's pick, keeping only what's valid for these candidates and memories. */
export function readPick(
	raw: Record<string, unknown>,
	candidateIds: string[],
	memoryCount: number
): {
	itemId: string;
	reason: string;
	firstStep: string;
	twoMinuteStart: string;
	memoriesUsed: number[];
} | null {
	const itemId = typeof raw.itemId === 'string' ? raw.itemId.trim() : '';
	if (!candidateIds.includes(itemId)) return null;
	const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
	const used = Array.isArray(raw.memoriesUsed) ? raw.memoriesUsed : [];
	return {
		itemId,
		reason: text(raw.reason),
		firstStep: text(raw.firstStep),
		twoMinuteStart: text(raw.twoMinuteStart),
		memoriesUsed: [...new Set(used.map(Number))].filter(
			(n) => Number.isInteger(n) && n >= 1 && n <= memoryCount
		)
	};
}
