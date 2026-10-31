// Intents live check (npm run dev running, migrations 0006 + 0007 applied): node.exe scripts/check-intents.mjs
// Captures six different kinds of goals, waits for analysis, and shows the intent, kind of practice,
// goal and date it guessed. Then makes a roadmap for the garden one to show the intent shaping it.
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const notes = [
	'Learn to tend a vegetable garden on my balcony',
	'Pass the AWS Cloud Practitioner exam on 12 December 2026',
	'See if I like pottery before buying a wheel',
	'Run three times a week',
	'Build a portfolio site with 3 case studies',
	'Learn to play jazz piano chords'
];

const ids = [];
for (const note of notes) {
	const { item } = await call('POST', '/api/items', { captureType: 'note', note, title: note });
	ids.push(item.id);
}
console.log(`Captured ${ids.length} notes; waiting for analysis...`);

const results = [];
for (const id of ids) {
	let found;
	for (let i = 0; i < 40; i++) {
		found = await call('GET', `/api/items/${id}`);
		if (found.item.status !== 'inbox' || found.item.analysisError) break;
		await wait(3000);
	}
	results.push(found.item);
	const it = found.item;
	console.log(`\n${it.title}`);
	if (it.analysisError) console.log(`  analysis failed: ${it.analysisError}`);
	console.log(
		`  intent: ${it.intent} | practice: ${it.practiceKind ?? '-'} | date: ${it.targetDate ?? '-'}`
	);
	console.log(`  goal: ${it.goal ?? '-'}`);
}

const garden = results[0];
console.log(
	`\n===== ROADMAP for "${garden.title}" (${garden.intent}, ${garden.practiceKind}) =====`
);
await call('POST', `/api/items/${garden.id}/roadmap`);
let roadmap = null;
for (let i = 0; i < 36 && !roadmap; i++) {
	await wait(5000);
	({ roadmap } = await call('GET', `/api/items/${garden.id}/roadmap`));
}
if (!roadmap)
	throw new Error('No roadmap appeared. Check the dev server log for [roadmap] errors.');
for (const m of roadmap.milestones) {
	console.log(`  ${m.title}`);
	for (const s of m.steps)
		console.log(`    - ${s.title}${s.recall ? `  (recall: ${s.recall})` : ''}`);
}
