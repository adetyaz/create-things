import type { RecalledMemory } from '$lib/server/features/memory/recall';
import { intentOf } from '$lib/server/features/intents/registry';
import { practiceKindOf } from '$lib/server/features/intents/practice';

export const ROADMAP_SYSTEM = `You plan projects and learning as navigation for a scattered person: there must always be a clear next step, small enough to start today. Every step takes 15–30 minutes and is an action to DO, not a topic to study. Skip what they already know. Reply with one JSON object only.`;

const STEP_SHAPE = `{ "title": "imperative, specific action", "minutes": 15-30, "twoMinute": "the tiniest way to start, under 2 minutes", "searchTerms": ["2-3 exact things to type into a search engine"], "tools": ["0-3 tools or apps needed"], "recall": "learning goals only: one question to answer from memory after the step, else omit" }`;

/** How brains learn (Learning How to Learn), applied to skill roadmaps. */
const LEARNING_RULES = [
	'Build it the way brains learn:',
	'- Each milestone is one chunk: understand it → practise it → use it somewhere new.',
	'- Frame steps as time on something ("25 minutes on chord shapes"), not "finish X".',
	'- Every step that teaches something gets a "recall" question to answer with the tab closed.',
	'- Practice steps in later milestones mix in skills from earlier ones (interleaving).',
	'- Spend extra practice on anything the memories say was hard.'
].join('\n');

function memoryLines(memories: RecalledMemory[]): string[] {
	if (memories.length === 0) return ['(nothing yet)'];
	return memories.map((m) => `- ${m.text}`);
}

export interface RoadmapContext {
	title: string;
	/** Ids from the intent and practice-kind registries. */
	intent: string;
	practiceKind: string | null;
	goal: string | null;
	targetDate: string | null;
	summary: string | null;
	brief: string | null;
	skills: string[];
	size: string | null;
	difficulty: string | null;
	memories: RecalledMemory[];
}

export function roadmapPrompt(c: RoadmapContext): string {
	const intent = intentOf(c.intent);
	const kind = practiceKindOf(c.practiceKind);
	return [
		`Make a roadmap for: "${c.title}"`,
		`What they're trying to do: ${intent.label.toLowerCase()}. ${intent.roadmapShape}`,
		intent.learning
			? LEARNING_RULES
			: 'Where a step teaches a new technique, give it a "recall" question too.',
		kind && `Kind of practice: ${kind.label.toLowerCase()}. ${kind.practice}`,
		c.goal && `Their goal: ${c.goal}. Every milestone should build toward it.`,
		c.targetDate && `Target date: ${c.targetDate}. Size the plan to fit before it.`,
		c.summary && `What it is: ${c.summary}`,
		c.brief && `Starting brief: ${c.brief}`,
		c.skills.length > 0 && `Skills it needs: ${c.skills.join(', ')}`,
		c.size && `Expected size: ${c.size}${c.difficulty ? `, ${c.difficulty}` : ''}`,
		'',
		'What you remember about them (skip what they know, design around what tripped them up):',
		...memoryLines(c.memories),
		'',
		'Return:',
		'{',
		`  "style": "${intent.roadmapStyle}",`,
		'  "skills": ["skills this builds"],',
		'  "resources": [{ "title": "...", "url": "only if you are sure it exists, else omit" }],',
		`  "milestones": [ { "title": "...", "steps": [ ${STEP_SHAPE} ] } ]`,
		'}',
		'3-5 milestones, 2-5 steps each.'
	]
		.filter((line) => line !== false && line !== null)
		.join('\n');
}

export function replanPrompt(c: {
	title: string;
	done: { milestone: string; title: string }[];
	remainingMilestones: string[];
	memories: RecalledMemory[];
}): string {
	return [
		`Re-plan the rest of the roadmap for: "${c.title}"`,
		'',
		'Steps they have finished:',
		...c.done.map((d) => `- [${d.milestone}] ${d.title}`),
		'',
		`Milestones still ahead: ${c.remainingMilestones.join(' → ')}`,
		'',
		'What you remember about them:',
		...memoryLines(c.memories),
		'',
		'Rewrite ONLY the milestones still ahead, building on what they have done and remember (shorten what they already know, add support where they struggled). You may rename or merge them.',
		'Mix earlier skills into the new practice steps, and give steps that teach something a "recall" question.',
		'Return:',
		`{ "milestones": [ { "title": "...", "steps": [ ${STEP_SHAPE} ] } ] }`
	].join('\n');
}
