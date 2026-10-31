/**
 * Kinds of practice (Breakdown §3b): the same intent practises differently by subject. Worked out
 * by the AI, never asked. Add one with a single entry here (Code layout rule 8).
 */

export interface PracticeKind {
	label: string;
	examples: string;
	/** How practice should look, for the roadmap prompt. */
	practice: string;
	/** What a proving ground looks like for this kind. */
	provingGround: string;
}

export const PRACTICE_KINDS = {
	body: {
		label: 'Body and hands',
		examples: 'guitar, piano, dance, woodworking, knife skills',
		practice: 'Slow then faster, with lots of repetition; one physical move at a time.',
		provingGround: 'real songs, routines or small builds that use only what they can do so far'
	},
	knowledge: {
		label: 'Knowledge',
		examples: 'cloud engineering, history, law, maths',
		practice: 'Recall, explain it back, and hands-on labs over reading.',
		provingGround: 'practice exam questions, a hands-on lab, a mini project'
	},
	real_world: {
		label: 'Real world and living things',
		examples: 'gardening, farming, cooking, caring for animals',
		practice: 'Tasks set by season, weather and place; observe and note what happens.',
		provingGround: 'a herb box, a harvest, a meal, a routine kept for a week'
	},
	creative: {
		label: 'Creative',
		examples: 'design, illustration, writing, music production',
		practice: 'Study and copy great work to learn, then make your own.',
		provingGround: 'an original piece using the techniques learned so far'
	},
	people: {
		label: 'People and language',
		examples: 'Spanish, public speaking, negotiation',
		practice: 'Real conversations and recordings of yourself.',
		provingGround: 'ordering food in Spanish, a 3-minute talk, a real conversation'
	}
} as const satisfies Record<string, PracticeKind>;

export type PracticeKindId = keyof typeof PRACTICE_KINDS;
export const PRACTICE_KIND_IDS = Object.keys(PRACTICE_KINDS) as PracticeKindId[];

export function isPracticeKindId(value: unknown): value is PracticeKindId {
	return typeof value === 'string' && value in PRACTICE_KINDS;
}

export function practiceKindOf(
	id: string | null | undefined
): (PracticeKind & { id: PracticeKindId }) | null {
	return isPracticeKindId(id) ? { id, ...PRACTICE_KINDS[id] } : null;
}
