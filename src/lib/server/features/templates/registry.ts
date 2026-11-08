/**
 * User types and their templates (design PRD B10): starting settings picked in onboarding, all
 * editable later, any goal able to override its rhythm. Adding a user type is one entry here.
 */
import type { Rhythm } from './rhythm';

export interface Template {
	id: string;
	label: string;
	/** Who it's for, one line, for the onboarding card. */
	blurb: string;
	rhythm: Rhythm;
	/** What the journal opens on. */
	journalPrompt: string;
	/** What feeds the pet, in their words (shown in the summary). */
	feeds: string;
	/** Reviews (flashcards) on, and how many a day. */
	reviews: { on: boolean; cap: number };
	quizzes: boolean;
	/** Intents their goals usually have (features/intents/registry.ts). */
	intents: string[];
	/** Where they likely save from (suggested in onboarding and Connections). */
	sources: string[];
	/** Words that suggest this type when someone describes themselves. */
	keywords: string[];
}

export const TEMPLATES: Template[] = [
	{
		id: 'crafts',
		label: 'Jewelry and crafts',
		blurb: 'Making things with your hands',
		rhythm: { every: 'days', n: 2, time: '19:00' },
		journalPrompt: 'What did you make? Add a photo of the piece.',
		feeds: 'pieces you make and techniques you practise',
		reviews: { on: false, cap: 3 },
		quizzes: false,
		intents: ['make', 'learn', 'try'],
		sources: ['pinterest', 'instagram'],
		keywords: [
			'jewelry',
			'jewellery',
			'ring',
			'craft',
			'knit',
			'sew',
			'pottery',
			'clay',
			'wood',
			'silver',
			'bead'
		]
	},
	{
		id: 'photography',
		label: 'Photography',
		blurb: 'Shooting, editing, getting better shots',
		rhythm: { every: 'daily', time: '20:00' },
		journalPrompt: "What did you shoot? One you're proud of, and why.",
		feeds: 'shots you log and photo challenges',
		reviews: { on: false, cap: 3 },
		quizzes: false,
		intents: ['make', 'learn'],
		sources: ['pinterest', 'arena', 'instagram'],
		keywords: ['photo', 'camera', 'shoot', 'lens', 'film', 'lightroom', 'portrait']
	},
	{
		id: 'art',
		label: 'Illustration and art',
		blurb: 'Drawing, painting, a sketch a day',
		rhythm: { every: 'daily', time: '20:00' },
		journalPrompt: "What did you draw? What's still hard?",
		feeds: 'sketches and finished pieces',
		reviews: { on: false, cap: 3 },
		quizzes: false,
		intents: ['make', 'learn'],
		sources: ['pinterest', 'arena', 'dribbble'],
		keywords: ['draw', 'sketch', 'paint', 'illustrat', 'art', 'procreate', 'comic']
	},
	{
		id: 'designer',
		label: 'Designer (UI, brand)',
		blurb: 'Interfaces, brands, studies of what you love',
		rhythm: { every: 'weekly', weekdays: [5], time: '17:00' },
		journalPrompt: 'What did you design? What did you borrow from?',
		feeds: 'pieces and studies of your references',
		reviews: { on: false, cap: 3 },
		quizzes: false,
		intents: ['make', 'learn'],
		sources: ['arena', 'pinterest', 'dribbble', 'x'],
		keywords: ['design', 'ui', 'ux', 'figma', 'brand', 'logo', 'typography', 'portfolio']
	},
	{
		id: 'music',
		label: 'Music (an instrument)',
		blurb: 'Practising, learning songs',
		rhythm: { every: 'daily', time: '19:00' },
		journalPrompt: "What did you practise, at what tempo, and what's still rough?",
		feeds: 'practice sessions and songs you learn',
		reviews: { on: true, cap: 5 },
		quizzes: false,
		intents: ['learn', 'make', 'habit'],
		sources: ['youtube'],
		keywords: [
			'piano',
			'guitar',
			'music',
			'song',
			'chord',
			'drum',
			'violin',
			'sing',
			'jazz',
			'beat'
		]
	},
	{
		id: 'writing',
		label: 'Writing',
		blurb: 'Words every day, pieces you finish',
		rhythm: { every: 'daily', time: '21:00' },
		journalPrompt: 'How many words? What surprised you?',
		feeds: 'words written and pieces finished',
		reviews: { on: false, cap: 3 },
		quizzes: false,
		intents: ['make', 'habit'],
		sources: ['x', 'arena'],
		keywords: ['write', 'writing', 'novel', 'blog', 'essay', 'poem', 'newsletter', 'story']
	},
	{
		id: 'concept',
		label: 'Learning a concept',
		blurb: 'Understanding something properly',
		rhythm: { every: 'daily', time: '18:00' },
		journalPrompt: 'Explain it in two lines, as if to a friend.',
		feeds: 'study sessions and explanations in your words',
		reviews: { on: true, cap: 5 },
		quizzes: true,
		intents: ['learn'],
		sources: ['youtube', 'x', 'github'],
		keywords: ['learn', 'understand', 'concept', 'math', 'physics', 'economics', 'theory']
	},
	{
		id: 'course',
		label: 'Following a course',
		blurb: 'A class, a bootcamp, a syllabus',
		rhythm: { every: 'daily', time: '18:00' },
		journalPrompt: "What from today's class is still fuzzy?",
		feeds: 'classes prepped and units done',
		reviews: { on: true, cap: 5 },
		quizzes: true,
		intents: ['course', 'learn'],
		sources: ['youtube'],
		keywords: [
			'course',
			'class',
			'bootcamp',
			'syllabus',
			'semester',
			'university',
			'lecture',
			'module'
		]
	},
	{
		id: 'exam',
		label: 'Exam or certification',
		blurb: 'e.g. a cloud engineer cert, by a date',
		rhythm: { every: 'daily', time: '07:30' },
		journalPrompt: 'What did you build or break in the lab?',
		feeds: 'labs and practice exams',
		reviews: { on: true, cap: 8 },
		quizzes: true,
		intents: ['learn', 'course'],
		sources: ['youtube', 'github'],
		keywords: ['exam', 'cert', 'certification', 'aws', 'azure', 'cloud', 'gcp', 'test', 'pass']
	},
	{
		id: 'language',
		label: 'A language',
		blurb: 'Speaking, reading, a little every day',
		rhythm: { every: 'daily', time: '08:00' },
		journalPrompt: 'Three new words, used in a sentence.',
		feeds: 'practice sessions',
		reviews: { on: true, cap: 8 },
		quizzes: true,
		intents: ['learn', 'habit'],
		sources: ['youtube'],
		keywords: [
			'spanish',
			'french',
			'japanese',
			'language',
			'german',
			'yoruba',
			'mandarin',
			'fluent',
			'speak'
		]
	},
	{
		id: 'habit',
		label: 'Fitness or a habit',
		blurb: 'Showing up regularly',
		rhythm: { every: 'daily', time: '20:00' },
		journalPrompt: 'Did it? How did it feel?',
		feeds: 'check-ins',
		reviews: { on: false, cap: 3 },
		quizzes: false,
		intents: ['habit'],
		sources: [],
		keywords: [
			'run',
			'gym',
			'fitness',
			'habit',
			'meditat',
			'workout',
			'yoga',
			'every day',
			'routine'
		]
	},
	{
		id: 'garden',
		label: 'Garden or tending',
		blurb: 'Plants, a garden, something that grows',
		rhythm: { every: 'weekly', weekdays: [6], time: '09:00' },
		journalPrompt: 'What changed? What needs doing?',
		feeds: 'tend sessions and harvests',
		reviews: { on: false, cap: 3 },
		quizzes: false,
		intents: ['tend', 'learn'],
		sources: ['pinterest', 'youtube'],
		keywords: ['garden', 'plant', 'grow', 'tomato', 'balcony', 'seed', 'compost']
	},
	{
		id: 'explorer',
		label: "Explorer (I'm scattered)",
		blurb: 'Lots of ideas; trying things to see what sticks',
		rhythm: { every: 'weekly', weekdays: [0], time: '18:00' },
		journalPrompt: 'What did you try? Keep it, park it or let it go?',
		feeds: 'taster sessions',
		reviews: { on: false, cap: 3 },
		quizzes: false,
		intents: ['try', 'make', 'learn'],
		sources: ['x', 'pinterest', 'arena', 'youtube'],
		keywords: ['scattered', 'ideas', 'everything', 'try', 'explore', 'curious']
	},
	{
		id: 'custom',
		label: 'Custom',
		blurb: 'Start blank and choose everything',
		rhythm: { every: 'daily', time: '19:00' },
		journalPrompt: 'What did you do today?',
		feeds: 'any real work on your goals',
		reviews: { on: true, cap: 5 },
		quizzes: true,
		intents: ['make', 'learn', 'try'],
		sources: [],
		keywords: []
	}
];

/** The short list some new users see (A/B experiment "template_list"). */
export const SHORT_LIST = ['crafts', 'designer', 'music', 'course', 'exam', 'explorer', 'custom'];

export function templateOf(id: string): Template | undefined {
	return TEMPLATES.find((t) => t.id === id);
}

/** Templates suggested by the words in a description ("I make silver rings…"), best first. */
export function suggestByWords(sentence: string, limit = 3): Template[] {
	const text = sentence.toLowerCase();
	// At the start of a word, so "art" doesn't match "particular" (but "illustrat" matches "illustrator").
	const has = (k: string) =>
		new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text);
	return TEMPLATES.map((t) => ({ t, score: t.keywords.filter(has).length }))
		.filter((x) => x.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((x) => x.t);
}

/** "You'll check in every 2 days at 19:00. Your pet eats when you log pieces you make…". */
export function summaryOf(templates: Template[], rhythmText: string, weeklyPlanDay = 'Sunday') {
	const feeds = [...new Set(templates.map((t) => t.feeds))].join('; ');
	const reviews = templates.some((t) => t.reviews.on)
		? 'Quick reviews help what you learn stick.'
		: 'Reviews are off (turn them on any time).';
	return `You'll check in ${rhythmText}. Your pet eats when you log ${feeds}. Weekly plan on ${weeklyPlanDay}s. ${reviews}`;
}
