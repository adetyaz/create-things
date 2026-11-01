// Flashcards + quizzes live check (npm run dev running, migration 0013 applied):
//   node.exe scripts/check-quiz.mjs
// 1. Finishes the current step of your jazz roadmap → its recall question becomes a flashcard.
// 2. Takes a practice quiz, answering the first option every time → wrong answers become cards.
// 3. Rates a card in the library to show the spaced-review dates.
// Cost: 2 credits (quiz), 1 AI call. Walrus: 1 `remember` for the review_weakness memory (5 points).
const BASE = 'http://localhost:5173';

async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
	return data;
}
const days = (iso) => Math.round((Date.parse(iso) - Date.now()) / 86400000);

const { items } = await call('GET', '/api/items');
const jazz = items.find(
	(i) => /jazz piano chords/i.test(i.title) && i.status !== 'archived' && i.status !== 'done'
);
const { roadmap } = await call('GET', `/api/items/${jazz?.id}/roadmap`);
if (!roadmap?.currentStep)
	throw new Error('Needs the jazz roadmap from check-goals.mjs with an unfinished step.');

console.log('===== 1. FINISH A STEP → FLASHCARD =====');
const step = roadmap.currentStep;
const done = await call('POST', `/api/steps/${step.id}/complete`);
console.log(`Finished: ${step.title}`);
console.log(`  recall question: ${step.recall ?? '(none on this step, so no card)'}`);
console.log(`  milestoneDone=${done.milestoneDone} quizReady=${done.quizReady}`);

console.log('\n===== 2. PRACTICE QUIZ =====');
const quiz = await call('POST', `/api/items/${jazz.id}/quiz`, {});
console.log(`Quiz on "${quiz.milestone}" (${quiz.questions.length} questions)`);
const wrong = [];
quiz.questions.forEach((q, n) => {
	const picked = 0; // always answer the first option, to get some wrong
	const right = picked === q.answer;
	console.log(`  ${n + 1}. ${q.question}`);
	console.log(
		`     picked "${q.options[picked]}" → ${right ? 'right' : `wrong (answer: ${q.options[q.answer]})`}`
	);
	console.log(`     ${q.explanation}`);
	if (!right)
		wrong.push({
			question: q.question,
			answer: q.options[q.answer],
			explanation: q.explanation,
			topic: q.topic
		});
});
const recorded = await call('POST', `/api/items/${jazz.id}/quiz/result`, {
	total: quiz.questions.length,
	wrong
});
console.log(`Wrong answers turned into ${recorded.cards} flashcards (due tomorrow)`);

console.log('\n===== 3. LIBRARY + SPACED REVIEW =====');
const { library } = await call('GET', '/api/cards');
for (const group of library) console.log(`  ${group.item}: ${group.cards.length} cards`);
const card = library.flatMap((g) => g.cards)[0];
if (card) {
	console.log(`Rating "${card.prompt.slice(0, 60)}":`);
	for (const rating of ['got_it', 'got_it', 'shaky', 'forgot']) {
		const { card: rated } = await call('POST', `/api/reviews/${card.id}`, { rating });
		console.log(`  ${rating.padEnd(7)} → next review in ${days(rated.nextReviewAt)} day(s)`);
	}
}
const due = await call('GET', '/api/reviews');
console.log(`Due now: ${due.dueTotal} (new cards are due tomorrow)`);

const { memories } = await call('GET', '/api/memories');
console.log(
	`\nMemory: ${memories.find((m) => m.type === 'review_weakness')?.summary ?? '(none: no wrong answers)'}`
);
