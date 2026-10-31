/**
 * Intents: what someone is trying to do (Breakdown §3b). Add one with a single entry here; it's
 * stored as a text id, so no migration is needed (Code layout rule 8).
 */
import type { PlanShapeId } from '$lib/server/features/plan/shapes';

export interface Intent {
	label: string;
	/** For the confirm card: "Looks like you want to <verb> …". */
	verb: string;
	/** For the analysis prompt: when to choose it. */
	description: string;
	/** Starts the goal memory: "Learning goal: …". */
	summaryLabel: string;
	memoryType: 'goal' | 'learning_goal';
	shape: PlanShapeId;
	roadmapStyle: 'project' | 'skill';
	/** How the roadmap is laid out, for the roadmap prompt. */
	roadmapShape: string;
	/** Learning How to Learn rules apply (chunks, recall, interleaving). */
	learning: boolean;
	/** What a goal looks like, for the goal prompt. */
	goalHint: string;
}

export const INTENTS = {
	learn: {
		label: 'Learn a skill',
		verb: 'learn',
		description: 'mainly about learning a skill ("learn Blender", "learn Spanish")',
		summaryLabel: 'Learning goal',
		memoryType: 'learning_goal',
		shape: 'roadmap',
		roadmapStyle: 'skill',
		roadmapShape: 'Use the skill shape: basics → practice → a small project of their own.',
		learning: true,
		goalHint: 'something real they can do at the end: a song, a 5-minute conversation, a dish'
	},
	make: {
		label: 'Make something',
		verb: 'make',
		description: 'making or recreating a specific thing (a site, a poster, a chair, an album)',
		summaryLabel: 'Wants to make',
		memoryType: 'goal',
		shape: 'roadmap',
		roadmapStyle: 'project',
		roadmapShape: 'Use the project shape: set up → build the core → polish → share or finish.',
		learning: false,
		goalHint: 'the finished thing and where it goes (a live site, a gift, a shop listing)'
	},
	course: {
		label: 'Follow a course',
		verb: 'follow',
		description: 'a course, class or certification they are taking (an AWS cert, a uni module)',
		summaryLabel: 'Following a course',
		memoryType: 'learning_goal',
		shape: 'roadmap',
		roadmapStyle: 'skill',
		roadmapShape:
			"Follow the course's units in order, adding practice around each one, and end with a project that uses it.",
		learning: true,
		goalHint: 'pass or finish the course, plus one project that uses what it teaches'
	},
	try: {
		label: 'Try it out',
		verb: 'try',
		description:
			'curious about something and wanting to try it lightly first ("see if I like pottery")',
		summaryLabel: 'Wants to try',
		memoryType: 'goal',
		shape: 'tasters',
		roadmapStyle: 'skill',
		roadmapShape:
			'Plan only taster sessions: 2–3 short sessions, each trying a different side of it, with the cheapest way to try it (a drop-in class, a starter kit, a video).',
		learning: true,
		goalHint: 'a clear decision after the tasters: keep it, park it or let it go'
	},
	tend: {
		label: 'Grow or tend something',
		verb: 'tend',
		description:
			'growing or caring for something living over time (a garden, a farm, sourdough, training a dog)',
		summaryLabel: 'Wants to tend',
		memoryType: 'goal',
		shape: 'recurring',
		roadmapStyle: 'skill',
		roadmapShape:
			'Follow real time: prepare → start → regular care → result, with care steps that repeat and fit the season.',
		learning: true,
		goalHint: 'a state of things: a first harvest, a starter that rises, a dog that sits'
	},
	habit: {
		label: 'Build a habit',
		verb: 'build',
		description: 'doing something regularly with no end date (running, reading, journaling)',
		summaryLabel: 'Wants the habit',
		memoryType: 'goal',
		shape: 'recurring',
		roadmapStyle: 'skill',
		roadmapShape:
			'Start tiny and grow: a 2-minute version first, then a steady version, then the full version.',
		learning: false,
		goalHint: 'who they are becoming ("I\'m a runner"), with a floor that always counts'
	}
} as const satisfies Record<string, Intent>;

export type IntentId = keyof typeof INTENTS;
export const INTENT_IDS = Object.keys(INTENTS) as IntentId[];
export const DEFAULT_INTENT: IntentId = 'make';

export function isIntentId(value: unknown): value is IntentId {
	return typeof value === 'string' && value in INTENTS;
}

/** The intent for a stored id; unknown or missing ids read as the default. */
export function intentOf(id: string | null | undefined): Intent & { id: IntentId } {
	const key = isIntentId(id) ? id : DEFAULT_INTENT;
	return { id: key, ...INTENTS[key] };
}
