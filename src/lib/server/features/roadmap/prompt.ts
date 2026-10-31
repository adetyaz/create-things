import type { RecalledMemory } from '$lib/server/features/memory/recall';
import { intentOf } from '$lib/server/features/intents/registry';
import { practiceKindOf } from '$lib/server/features/intents/practice';
import { resolveShape } from '$lib/server/features/plan/shapes';

export const ROADMAP_SYSTEM = `You plan projects and learning as navigation for a scattered person: there must always be a clear next step, small enough to start today. Every step takes 15–30 minutes and is an action to DO, not a topic to study. Skip what they already know. Reply with one JSON object only.`;

const STEP_SHAPE = `{ "title": "imperative, specific action", "minutes": 15-30, "twoMinute": "the tiniest way to start, under 2 minutes", "searchTerms": ["2-3 exact things to type into a search engine"], "tools": ["0-3 tools or apps needed"], "recall": "learning goals only: one question to answer from memory after the step, else omit" }`;

/** How brains learn (Learning How to Learn), applied to skill roadmaps. */
const LEARNING_RULES = [
	'Build it the way brains learn:',
	'- Each milestone is one chunk: understand it → practise it → use it somewhere new.',
	'- Frame steps as time on something ("25 minutes on chord shapes"), not "finish X".',
	'- Every step that teaches something gets a "recall" question to answer with the tab closed.',
	'- Practice steps in later milestones mix in skills from earlier ones (interleaving).',
	'- Spend extra practice on anything the memories say was hard.',
	'Follow these rules quietly: never put their names (chunk, interleaving, recall) in step titles.'
].join('\n');

const PROOF_SHAPE = `{ "title": "the real thing to do, named", "minutes": 20-45, "twoMinute": "...", "searchTerms": ["how to find it: chords, tabs, lab guide"], "tools": [] }`;

/**
 * Proving grounds for learning intents: real things after each milestone that use only what has
 * been learned so far. Names songs and pieces; never writes out sheet music or lyrics.
 */
function provingGroundRules(c: { intent: string; practiceKind: string | null }): string | null {
	if (!hasProvingGrounds(c.intent)) return null;
	const kind = practiceKindOf(c.practiceKind);
	return [
		`End every milestone with a "provingGround" list of 1–3 items: ${kind ? kind.provingGround : 'real things to do'} that use ONLY what has been learned so far, a little harder each milestone, building toward the goal.`,
		'Name real, well-known songs, pieces, labs or projects. Give search terms to find the chords, tabs or instructions. Never write out sheet music, tabs or lyrics.'
	].join('\n');
}

/** The course's units, which the milestones must follow exactly. */
function courseLines(units: RoadmapContext['courseUnits']): string[] {
	if (!units?.length) return [];
	return [
		'This follows a course. Make exactly one milestone per unit, in this order, titled exactly as the unit. Add your own steps and proving grounds around each unit; never drop, merge or reorder units:',
		...units.map(
			(u, i) =>
				`${i + 1}. ${u.title}${u.unitDate ? ` (class ${u.unitDate})` : ''}${u.topics?.length ? `: ${u.topics.join(', ')}` : ''}`
		)
	];
}

/** Learning intents get proving grounds; tasters are already small tries, so they don't. */
function hasProvingGrounds(intentId: string): boolean {
	return intentOf(intentId).learning && !isTasters(intentId);
}

export function isTasters(intentId: string): boolean {
	return resolveShape(intentOf(intentId).shape) === 'tasters';
}

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
	/** True when the user chose the goal: keep it exactly. */
	goalChosen?: boolean;
	targetDate: string | null;
	/** A course's units in order: one milestone each, same titles, same order. */
	courseUnits?: { title: string; topics: string[] | null; unitDate: string | null }[];
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
		c.goal &&
			(c.goalChosen
				? `Their goal (they chose it, keep it exactly): ${c.goal}. Every milestone builds toward it.`
				: `Their goal, roughly: ${c.goal}. Every milestone builds toward it.`),
		`Goal options: suggest 3 concrete goals, each starting "By the end you'll be able to", ${intent.goalHint}; the first closest to their goal.`,
		provingGroundRules(c),
		c.targetDate && `Target date: ${c.targetDate}. Size the plan to fit before it.`,
		...courseLines(c.courseUnits),
		c.summary && `What it is: ${c.summary}`,
		c.brief && `Starting brief: ${c.brief}`,
		c.skills.length > 0 && `Skills it needs: ${c.skills.join(', ')}`,
		c.size && `Expected size: ${c.size}${c.difficulty ? `, ${c.difficulty}` : ''}`,
		'',
		'What you remember about them (use only what is about this subject: skip what they know, design around what tripped them up):',
		...memoryLines(c.memories),
		'',
		'Return:',
		'{',
		`  "style": "${intent.roadmapStyle}",`,
		`  "goalOptions": ["By the end you'll be able to …", "…", "…"],`,
		'  "skills": ["skills this builds"],',
		'  "resources": [{ "title": "...", "url": "only if you are sure it exists, else omit" }],',
		`  "milestones": [ { "title": "...", "steps": [ ${STEP_SHAPE} ]${hasProvingGrounds(c.intent) ? `, "provingGround": [ ${PROOF_SHAPE} ]` : ''} } ]`,
		'}',
		isTasters(c.intent)
			? 'Exactly 1 milestone titled "Taster sessions" with 2-3 steps of 20-45 minutes each.'
			: c.courseUnits?.length
				? `${c.courseUnits.length} milestones, one per unit, ${c.courseUnits.length > 8 ? '2-3' : '2-5'} steps each.`
				: '3-5 milestones, 2-5 steps each.'
	]
		.filter((line) => line !== false && line !== null)
		.join('\n');
}

export function replanPrompt(c: {
	title: string;
	intent: string;
	practiceKind: string | null;
	goal: string | null;
	/** True for a course: its units stay as milestones, same titles, same order. */
	isCourse?: boolean;
	done: { milestone: string; title: string }[];
	remainingMilestones: string[];
	memories: RecalledMemory[];
}): string {
	const learning = hasProvingGrounds(c.intent);
	return [
		`Re-plan the rest of the roadmap for: "${c.title}"`,
		c.goal ? `Their goal (keep it): ${c.goal}. Everything ahead builds toward it.` : '',
		provingGroundRules(c) ?? '',
		'',
		'Steps they have finished:',
		...c.done.map((d) => `- [${d.milestone}] ${d.title}`),
		'',
		`Milestones still ahead: ${c.remainingMilestones.join(' → ')}`,
		'',
		'What you remember about them (use only what is about this subject):',
		...memoryLines(c.memories),
		'',
		c.isCourse
			? 'Rewrite ONLY the steps of the milestones still ahead, building on what they have done and remember. These milestones are course units: keep every one, with the same title, in the same order.'
			: 'Rewrite ONLY the milestones still ahead, building on what they have done and remember (shorten what they already know, add support where they struggled). You may rename or merge them.',
		'Mix earlier skills into the new practice steps, and give steps that teach something a "recall" question.',
		'Return:',
		`{ "milestones": [ { "title": "...", "steps": [ ${STEP_SHAPE} ]${learning ? `, "provingGround": [ ${PROOF_SHAPE} ]` : ''} } ] }`
	]
		.filter((line, i, all) => line !== '' || all[i - 1] !== '')
		.join('\n');
}
