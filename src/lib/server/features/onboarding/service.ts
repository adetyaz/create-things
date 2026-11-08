/**
 * Onboarding (design PRD C1): what brings you here (user types, or a sentence) → your rhythm in
 * plain words → meet your pet (personality previews) → how lenient → brain dump → Today.
 * Defaults come from the user's A/B variants; everything stays editable.
 */
import { eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { userSettings } from '$lib/server/db/schema';
import { generateJson } from '$lib/server/ai';
import { recordEvent, variantFor } from '$lib/server/features/experiments/service';
import { captureItem } from '$lib/server/features/items/service';
import { adoptPet, getPet } from '$lib/server/features/pet/service';
import { SPECIES } from '$lib/server/features/pet/species';
import {
	SHORT_LIST,
	suggestByWords,
	TEMPLATES,
	templateOf
} from '$lib/server/features/templates/registry';
import { getRhythm, setRhythm, type Leniency } from '$lib/server/features/templates/service';
import type { CompleteInput } from './input';

type Platform = App.Platform | undefined;

/** What the onboarding screens show for this user (their variants decide the defaults). */
export async function onboardingFor(platform: Platform, userId: string) {
	const [ask, list, count, timeline] = await Promise.all([
		variantFor(platform, userId, 'onboarding_ask'),
		variantFor(platform, userId, 'template_list'),
		variantFor(platform, userId, 'type_count'),
		variantFor(platform, userId, 'pet_timeline')
	]);
	const [settings] = await withDb(platform, (db) =>
		db
			.select({ onboardedAt: userSettings.onboardedAt })
			.from(userSettings)
			.where(eq(userSettings.userId, userId))
	);
	return {
		done: !!settings?.onboardedAt,
		/** "types": the card grid; "sentence": the describe-yourself box; "both". */
		ask,
		/** How many user types can be picked. */
		maxTypes: count === 'one' ? 1 : 3,
		templates: (list === 'short'
			? TEMPLATES.filter((t) => SHORT_LIST.includes(t.id))
			: TEMPLATES
		).map((t) => ({
			id: t.id,
			label: t.label,
			blurb: t.blurb,
			rhythm: t.rhythm,
			journalPrompt: t.journalPrompt,
			feeds: t.feeds
		})),
		species: SPECIES,
		defaults: {
			leniency: timeline as Leniency,
			template: 'explorer',
			species: 'dog',
			breed: 'golden_retriever'
		}
	};
}

const SUGGEST_SYSTEM = `Pick the 1–3 user types that best fit how this person describes themselves.
Reply with JSON only: {"ids": ["..."]}. Use only these ids:
${TEMPLATES.filter((t) => t.id !== 'custom')
	.map((t) => `${t.id}: ${t.label} (${t.blurb})`)
	.join('\n')}`;

/**
 * "Describe yourself in a sentence" → suggested templates. Free words first; a small AI call
 * (free during onboarding) only when the words don't match any type.
 */
export async function suggestTemplates(platform: Platform, sentence: string) {
	let picked = suggestByWords(sentence);
	let by: 'words' | 'ai' | 'default' = 'words';
	if (!picked.length) {
		try {
			const { data } = await generateJson(platform, {
				system: SUGGEST_SYSTEM,
				prompt: sentence.slice(0, 500),
				schema: {
					type: 'object',
					properties: { ids: { type: 'array', items: { type: 'string' } } },
					required: ['ids']
				},
				maxTokens: 80
			});
			picked = (Array.isArray(data.ids) ? data.ids : [])
				.map((id) => templateOf(String(id)))
				.filter((t) => !!t)
				.slice(0, 3) as typeof picked;
			by = 'ai';
		} catch (e) {
			console.error('[onboarding] suggest failed', e);
		}
	}
	if (!picked.length) {
		picked = [templateOf('explorer')!];
		by = 'default';
	}
	return { by, templates: picked.map((t) => ({ id: t.id, label: t.label, blurb: t.blurb })) };
}

/** Saves everything chosen, adopts the pet, saves the brain dump, and marks onboarding done. */
export async function completeOnboarding(platform: Platform, userId: string, input: CompleteInput) {
	const [timeline, hunger, perDay] = await Promise.all([
		variantFor(platform, userId, 'pet_timeline'),
		variantFor(platform, userId, 'hunger_mode'),
		variantFor(platform, userId, 'reminders_per_day')
	]);
	const rhythm = await setRhythm(platform, userId, {
		templates: input.templates.length ? input.templates : ['explorer'],
		rhythm: input.rhythm,
		reviews: input.reviews,
		leniency: input.leniency ?? (timeline as Leniency),
		hungerMode: input.hungerMode ?? (hunger as 'days' | 'check_ins')
	});
	await withDb(platform, (db) =>
		db
			.insert(userSettings)
			.values({
				userId,
				onboardedAt: new Date(),
				remindersPerDay: Number(perDay),
				...(input.tone !== undefined && { tone: input.tone })
			})
			.onConflictDoUpdate({
				target: userSettings.userId,
				set: {
					onboardedAt: new Date(),
					remindersPerDay: Number(perDay),
					...(input.tone !== undefined && { tone: input.tone })
				}
			})
	);

	const pet = input.pet
		? ((await adoptPet(platform, userId, input.pet)) ?? (await getPet(platform, userId)))
		: await getPet(platform, userId);

	const saved = [];
	for (const thing of input.brainDump ?? []) {
		const isLink = /^https?:\/\/\S+$/i.test(thing);
		const { item } = await captureItem(
			platform,
			userId,
			isLink ? { captureType: 'url', sourceUrl: thing } : { captureType: 'note', note: thing }
		);
		saved.push({ id: item.id, title: item.title });
	}

	await recordEvent(platform, userId, 'onboarded', { templates: input.templates });
	return { rhythm, pet, saved, next: 'today' as const };
}

export { getRhythm };
