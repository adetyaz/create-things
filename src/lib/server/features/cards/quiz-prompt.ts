/** Practice quizzes: multiple choice from a milestone, with older material mixed in. */

export const QUIZ_SYSTEM = `You write short practice quizzes that help a learner find what they don't really know yet. Questions test understanding, not trivia. Every question has exactly one correct option and a one-sentence explanation. Reply with one JSON object only.`;

export interface QuizSource {
	itemTitle: string;
	milestone: string;
	steps: { title: string; recall: string | null; recallAnswer: string | null }[];
	/** Recall questions from earlier milestones, for interleaving. */
	earlier: { question: string; answer: string | null }[];
}

export function quizPrompt(s: QuizSource): string {
	return [
		`Make a practice quiz on "${s.milestone}" from "${s.itemTitle}".`,
		'',
		'What this milestone covered:',
		...s.steps.map(
			(st) =>
				`- ${st.title}${st.recall ? ` (recall: ${st.recall}${st.recallAnswer ? ` → ${st.recallAnswer}` : ''})` : ''}`
		),
		s.earlier.length ? '\nFrom earlier milestones (mix 1-2 of these in):' : '',
		...s.earlier.map((e) => `- ${e.question}${e.answer ? ` → ${e.answer}` : ''}`),
		'',
		'5-8 questions. Include at least one "which comes next" question about the order of a process.',
		'Return:',
		'{ "questions": [ { "question": "...", "options": ["4 options"], "answer": index of the correct option (0-3), "explanation": "one sentence", "topic": "2-4 words" } ] }'
	]
		.filter((line) => line !== '')
		.join('\n');
}

export interface QuizQuestion {
	question: string;
	options: string[];
	answer: number;
	explanation: string;
	topic: string;
}

/** Keeps only well-formed questions: 2–5 options and an answer that points at one of them. */
export function readQuiz(raw: Record<string, unknown>): QuizQuestion[] {
	const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
	return (Array.isArray(raw.questions) ? raw.questions : [])
		.map((q) => {
			const item = (q ?? {}) as Record<string, unknown>;
			const options = (Array.isArray(item.options) ? item.options : []).map(text).filter(Boolean);
			return {
				question: text(item.question),
				options,
				answer: Number(item.answer),
				explanation: text(item.explanation),
				topic: text(item.topic) || 'general'
			};
		})
		.filter(
			(q) =>
				q.question &&
				q.options.length >= 2 &&
				q.options.length <= 5 &&
				Number.isInteger(q.answer) &&
				q.answer >= 0 &&
				q.answer < q.options.length
		)
		.slice(0, 8);
}

/**
 * Models tend to put the right answer in the same spot (never first, in testing), which learners
 * pick up on. Shuffle each question's options and follow the answer to its new place.
 */
export function shuffleOptions(q: QuizQuestion, random: () => number = Math.random): QuizQuestion {
	const order = q.options.map((_, i) => i);
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}
	return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}
