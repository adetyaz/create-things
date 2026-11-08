/**
 * A/B experiments (design PRD B10): where there's no clear right answer, new users get one
 * variant as their *defaults*; they can always change their own settings. Adding an experiment is
 * one entry. Outcomes are counted from product_events in our own database.
 */

export interface Experiment {
	id: string;
	/** What it tests, in plain words. */
	question: string;
	/** Variants share users equally; the first is the control. */
	variants: string[];
}

export const EXPERIMENTS: Experiment[] = [
	{
		id: 'onboarding_ask',
		question: 'How onboarding asks what brings you here',
		variants: ['types', 'sentence', 'both']
	},
	{
		id: 'template_list',
		question: 'A short (6) or full template list in onboarding',
		variants: ['full', 'short']
	},
	{
		id: 'type_count',
		question: 'Pick one user type, or several',
		variants: ['several', 'one']
	},
	{
		id: 'hunger_mode',
		question: 'Hunger counted in days or in missed check-ins',
		variants: ['days', 'check_ins']
	},
	{
		id: 'pet_timeline',
		question: 'Gentle (30/60 days) or firmer (21/42) default pet timeline',
		variants: ['gentle', 'firm']
	},
	{
		id: 'reminders_per_day',
		question: 'How many reminders a day by default',
		variants: ['3', '2', '4']
	}
];

/** Outcomes compared between variants (event names in product_events). */
export const OUTCOMES = [
	'onboarded',
	'first_step_done',
	'check_in',
	'came_back_7d',
	'came_back_30d'
];

export function experimentOf(id: string): Experiment | undefined {
	return EXPERIMENTS.find((e) => e.id === id);
}
