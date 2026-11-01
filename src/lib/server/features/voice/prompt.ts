/** Voice ("just yap"): turn a ramble into separate ideas, each with a suggested place. */

export const IDEA_KINDS = ['new_item', 'step', 'journal', 'learning_goal'] as const;
export type IdeaKind = (typeof IDEA_KINDS)[number];

export const VOICE_SYSTEM = `You help a scattered person who just rambled their thoughts out loud. Split what they said into separate ideas, keep their meaning, and drop filler ("um", "okay so"). Reply with one JSON object only.`;

export function voicePrompt(input: { transcript: string | null; known: string[] }): string {
	return [
		input.transcript
			? `What they said:\n"${input.transcript}"`
			: 'Transcribe the attached audio, then split it.',
		'',
		input.known.length
			? `Things they already have (Focus, goals, Shortlist):\n${input.known.map((k) => `- ${k}`).join('\n')}`
			: 'They have nothing saved yet.',
		'',
		'For each idea, choose where it belongs:',
		'- new_item: something new they want to make or do',
		'- step: something to do for one of the things they already have; only when it clearly belongs to one, else new_item',
		'- journal: a reflection on how something went or what they noticed',
		'- learning_goal: something they want to learn',
		'',
		'Return:',
		'{',
		input.transcript ? '' : '  "transcript": "what they said, cleaned of filler",',
		'  "ideas": [ { "title": "max 8 words", "text": "the idea in one or two sentences, in their words", "kind": "new_item | step | journal | learning_goal", "forItem": "for a step: copied exactly from the list above, else empty" } ]',
		'}'
	]
		.filter((line) => line !== '')
		.join('\n');
}

export interface VoiceIdea {
	title: string;
	text: string;
	kind: IdeaKind;
	forItem: string | null;
}

/** Reads the model's reply; unknown kinds become new items, empty ideas are dropped. */
export function readVoice(
	raw: Record<string, unknown>,
	transcript: string | null,
	known: string[] = []
): { transcript: string; ideas: VoiceIdea[] } {
	const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
	const ideas = (Array.isArray(raw.ideas) ? raw.ideas : [])
		.slice(0, 12)
		.map((i) => {
			const idea = (i ?? {}) as Record<string, unknown>;
			const kind = text(idea.kind) as IdeaKind;
			// A step only counts for something they really have; otherwise it's a new item.
			const forItem =
				known.find((k) => k.toLowerCase() === text(idea.forItem).toLowerCase()) ?? null;
			const valid = IDEA_KINDS.includes(kind) ? kind : 'new_item';
			return {
				title: text(idea.title).slice(0, 80),
				text: text(idea.text).slice(0, 600),
				kind: valid === 'step' && !forItem ? 'new_item' : valid,
				forItem: valid === 'step' ? forItem : null
			};
		})
		.filter((i) => i.title || i.text);
	return { transcript: transcript ?? text(raw.transcript), ideas };
}
