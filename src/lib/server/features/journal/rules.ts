/**
 * Journal rules without the database: how much an entry feeds the pet, what it's about, and
 * whether it sounds like learning. Free rules first; a small AI check only when these can't tell.
 */
import type { FoodSize } from '$lib/server/features/pet/rules';

/** An entry this long (in words) is a real reflection: a meal. Shorter ones are snacks. */
export const MEAL_WORDS = 40;

export function wordCount(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Check-ins are snacks; entries are snacks or meals by depth. */
export function foodFor(kind: 'entry' | 'check_in', body: string): FoodSize {
	return kind === 'entry' && wordCount(body) >= MEAL_WORDS ? 'meal' : 'snack';
}

const STOPWORDS = new Set([
	'about',
	'after',
	'again',
	'before',
	'from',
	'have',
	'into',
	'just',
	'learn',
	'like',
	'make',
	'more',
	'that',
	'their',
	'them',
	'then',
	'this',
	'today',
	'with',
	'your',
	'want',
	'what',
	'when',
	'will'
]);

function keywords(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((w) => w.length >= 4 && !STOPWORDS.has(w))
			.map((w) => w.replace(/(ing|ed|es|s)$/, ''))
	);
}

/**
 * The item an entry is about, by shared words with titles and current step titles ("practised
 * the chords" → "Learn jazz piano chords"). Null when nothing clearly matches.
 */
export function matchItem<T extends { id: string; title: string; step?: string | null }>(
	body: string,
	candidates: T[]
): T | null {
	const words = keywords(body);
	let best: { item: T; score: number } | null = null;
	for (const item of candidates) {
		const theirs = keywords(`${item.title} ${item.step ?? ''}`);
		const score = [...theirs].filter((w) => words.has(w)).length;
		if (score > 0 && (!best || score > best.score)) best = { item, score };
	}
	return best?.item ?? null;
}

/** Sounds like something was learned: worth offering flashcards. */
export function soundsLikeLearning(body: string): boolean {
	return /\b(learn(ed|t)|realis(ed|e)|realiz(ed|e)|figured out|understand|understood|turns out|now i know|til|the trick is|remember to)\b/i.test(
		body
	);
}
