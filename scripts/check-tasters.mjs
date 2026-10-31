// Tasters live check (npm run dev running): node.exe scripts/check-tasters.mjs
// Plans taster sessions for "See if I like pottery", finishes them, shows the keep / park / let go
// question, keeps it, and shows the full plan that replaces the tasters.
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

async function newRoadmap(itemId, after) {
	for (let i = 0; i < 36; i++) {
		await wait(5000);
		const { roadmap, planError } = await call('GET', `/api/items/${itemId}/roadmap`);
		if (planError) throw new Error(`Planning failed: ${planError}`);
		if (roadmap && roadmap.roadmap.createdAt !== after) return roadmap;
	}
	throw new Error('No new roadmap appeared.');
}

const { items } = await call('GET', '/api/items');
const pottery = items.find((i) => /pottery/i.test(i.title));
if (!pottery) throw new Error('Needs the pottery item from check-intents.mjs.');
console.log(`${pottery.title} (intent: ${pottery.intent})`);

console.log('\n===== TASTER SESSIONS =====');
const before = (await call('GET', `/api/items/${pottery.id}/roadmap`)).roadmap?.roadmap.createdAt;
await call('POST', `/api/items/${pottery.id}/roadmap`);
const tasters = await newRoadmap(pottery.id, before);
for (const m of tasters.milestones) {
	console.log(`  ${m.title}`);
	for (const s of m.steps) console.log(`    - ${s.title} (${s.minutes} min)`);
}

console.log('\n===== FINISH THEM =====');
let decide = null;
for (const m of tasters.milestones) {
	for (const s of m.steps) {
		const done = await call('POST', `/api/steps/${s.id}/complete`);
		decide = done.decide ?? decide;
	}
}
console.log(`  Pet: ${decide ? decide.message : '(no question: check isTasters)'}`);

console.log('\n===== KEEP IT =====');
const kept = await call('POST', `/api/items/${pottery.id}/tasters`, {
	choice: 'keep',
	note: 'Loved the wheel class, hand-building less so'
});
console.log(`  ${kept.status}: now "${kept.intent}", planning a full roadmap`);
const full = await newRoadmap(pottery.id, tasters.roadmap.createdAt);
console.log(`  Goal: ${full.roadmap.goal}`);
for (const m of full.milestones) console.log(`  ${m.title} (${m.steps.length} steps)`);

const { memories } = await call('GET', '/api/memories');
console.log(`\nMemory: ${memories[0]?.type}: ${memories[0]?.summary}`);
