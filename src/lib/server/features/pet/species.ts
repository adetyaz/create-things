/**
 * Species and breeds: each breed has a personality that changes how the pet says things, never what
 * it advises (Breakdown §10). Adding a breed is one entry; its 3D look comes with the UI.
 */

export interface Breed {
	id: string;
	label: string;
	/** One line for onboarding and prompts: how this pet talks. */
	personality: string;
	/** The same advice in its voice, gentle and savage ends of the tone slider (onboarding preview). */
	voice: { gentle: string; savage: string };
}

export interface Species {
	id: string;
	label: string;
	/** What it eats (cookies, bones, fish, embers). */
	food: string;
	breeds: Breed[];
}

export const SPECIES: Species[] = [
	{
		id: 'dog',
		label: 'Dog',
		food: 'bones',
		breeds: [
			{
				id: 'golden_retriever',
				label: 'Golden retriever',
				personality: 'Eager to help, cheers every small win',
				voice: {
					gentle: "Let's go! Just 5 minutes on it?",
					savage: "Up! Five minutes. I've been waiting all day!"
				}
			},
			{
				id: 'husky',
				label: 'Husky',
				personality: 'Dramatic, howls about everything, means well',
				voice: {
					gentle: 'Five minutes together? Please? For me?',
					savage: 'AWOOO. Five minutes or I tell everyone you gave up.'
				}
			}
		]
	},
	{
		id: 'cat',
		label: 'Cat',
		food: 'fish',
		breeds: [
			{
				id: 'tabby',
				label: 'Tabby',
				personality: 'Sarcastic, secretly proud of you',
				voice: {
					gentle: 'Five minutes. I believe in you, mostly.',
					savage: 'Five minutes. Even you can manage that.'
				}
			},
			{
				id: 'black_cat',
				label: 'Black cat',
				personality: 'Dry and mysterious, few words',
				voice: { gentle: 'Five minutes. Then rest.', savage: 'Five minutes. Now.' }
			}
		]
	},
	{
		id: 'monster',
		label: 'Fluffy monster',
		food: 'cookies',
		breeds: [
			{
				id: 'fluffball',
				label: 'Fluffball',
				personality: 'Soft and encouraging, celebrates showing up',
				voice: {
					gentle: 'Just 5 tiny minutes? I made you a cookie.',
					savage: 'No cookies until 5 minutes are done. Rules are rules.'
				}
			},
			{
				id: 'grump',
				label: 'Grump',
				personality: 'Grumbles constantly, kind underneath',
				voice: {
					gentle: 'Hmph. Five minutes would be… fine. Good, even.',
					savage: 'Ugh. Five minutes. Stop staring at me and do it.'
				}
			}
		]
	},
	{
		id: 'dragon',
		label: 'Dragon',
		food: 'embers',
		breeds: [
			{
				id: 'ember',
				label: 'Ember',
				personality: 'Proud and blunt, expects greatness',
				voice: {
					gentle: 'Five minutes. A dragon starts small too.',
					savage: 'Five minutes. Dragons do not dawdle.'
				}
			},
			{
				id: 'frost',
				label: 'Frost',
				personality: 'Calm and stern, a quiet coach',
				voice: {
					gentle: 'Breathe. Five minutes, then we see.',
					savage: 'Five minutes. No excuses survive the cold.'
				}
			}
		]
	}
];

export function speciesOf(id: string): Species | undefined {
	return SPECIES.find((s) => s.id === id);
}

export function breedOf(speciesId: string, breedId: string): Breed | undefined {
	return speciesOf(speciesId)?.breeds.find((b) => b.id === breedId);
}
