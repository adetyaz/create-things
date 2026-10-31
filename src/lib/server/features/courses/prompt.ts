import { PRACTICE_KIND_IDS, PRACTICE_KINDS } from '$lib/server/features/intents/practice';

export const COURSE_SYSTEM = `You read course syllabuses, curriculums and lesson lists from documents and screenshots, and return their structure exactly as given: same units, same order, same dates. Never invent units or dates. Reply with one JSON object only.`;

export function coursePrompt(input: { title?: string; note?: string; today: string }): string {
	return [
		'Read the attached syllabus (it may be several pages or screenshots, in order).',
		input.title && `The person calls this course: ${input.title}`,
		input.note && `Their note: "${input.note}"`,
		`Today is ${input.today}; use it to work out the year for dates written without one.`,
		'',
		'Return:',
		'{',
		'  "title": "the course name",',
		'  "provider": "who runs it (school, platform, teacher), or empty",',
		'  "summary": "one sentence: what the course teaches",',
		`  "practiceKind": one of ${PRACTICE_KIND_IDS.join(' | ')}, or "" if unclear,`,
		'  "goal": "one sentence: what they can do after the course, concrete",',
		'  "examDate": "YYYY-MM-DD if a final exam or end date is given, else empty",',
		'  "skills": ["3-6 skills it builds"],',
		'  "units": [ { "title": "the unit label and its subject in a few words, such as Week 1: Open E minor and A minor", "topics": ["main topics"], "date": "YYYY-MM-DD if this unit has a class or due date, else empty" } ]',
		'}',
		'Kinds of practice:',
		...PRACTICE_KIND_IDS.map((id) => `- ${id}: ${PRACTICE_KINDS[id].examples}`),
		'Keep every unit, in the order given. Merge nothing, skip nothing.'
	]
		.filter((line) => line !== undefined && line !== '')
		.join('\n');
}
