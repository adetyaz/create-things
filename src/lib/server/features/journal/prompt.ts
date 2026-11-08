/** Prompts for the journal's two small AI calls: what an entry is about, and flashcards from it. */

export const ABOUT_SYSTEM = `You match a short journal entry to one of the user's current goals.
Reply with JSON only: {"itemId": "<id or null>", "realWork": true|false}.
realWork is true only when the entry describes doing, practising or reflecting on that goal's work
(not plans, wishes or unrelated life). When unsure, itemId is null.`;

export function aboutPrompt(
	body: string,
	goals: { id: string; title: string; step?: string | null }[]
) {
	return `Goals:\n${goals
		.map((g) => `- ${g.id}: ${g.title}${g.step ? ` (current step: ${g.step})` : ''}`)
		.join('\n')}\n\nEntry:\n"""${body.slice(0, 1200)}"""`;
}

export const ABOUT_SCHEMA = {
	type: 'object',
	properties: { itemId: { type: ['string', 'null'] }, realWork: { type: 'boolean' } },
	required: ['itemId', 'realWork']
};

export const CARDS_SYSTEM = `You turn what someone learned (from their journal entry) into 1–3 flashcards
that test recall, not recognition. Each card: a short question and a short answer in their own words
where possible. Only use what the entry says; never invent facts. Reply with JSON only:
{"cards": [{"prompt": "...", "answer": "..."}]}`;

export function cardsPrompt(body: string, about: string | null) {
	return `${about ? `About: ${about}\n` : ''}Entry:\n"""${body.slice(0, 3000)}"""`;
}

export const CARDS_SCHEMA = {
	type: 'object',
	properties: {
		cards: {
			type: 'array',
			items: {
				type: 'object',
				properties: { prompt: { type: 'string' }, answer: { type: 'string' } },
				required: ['prompt', 'answer']
			}
		}
	},
	required: ['cards']
};

/** Usable cards from the model: trimmed, capped, at most 3. */
export function readCards(data: Record<string, unknown>): { prompt: string; answer: string }[] {
	const cards = Array.isArray(data.cards) ? data.cards : [];
	return cards
		.map((c) => ({
			prompt: String((c as Record<string, unknown>).prompt ?? '')
				.trim()
				.slice(0, 300),
			answer: String((c as Record<string, unknown>).answer ?? '')
				.trim()
				.slice(0, 600)
		}))
		.filter((c) => c.prompt && c.answer)
		.slice(0, 3);
}
