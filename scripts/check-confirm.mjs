// Confirm card live check (npm run dev running; run check-intents.mjs first):
//   node.exe scripts/check-confirm.mjs
// 1. Starts an unconfirmed item (pottery, running or the portfolio): the reply carries the confirm
//    card and no roadmap is made yet.
// 2. Confirms it as is: the roadmap is planned then, in that intent's shape.
// 3. Corrects "Grow cherry tomatoes" from learn to tend: remembered as a correction.
// Your Focus item is paused first and started again at the end.
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

const { items } = await call('GET', '/api/items');
// The first of these not confirmed yet, so the card shows; pottery if all are confirmed.
const pottery =
	items.find(
		(i) => /pottery|three times a week|portfolio site/i.test(i.title) && !i.intentConfirmedAt
	) ?? items.find((i) => /pottery/i.test(i.title));
const tomatoes = items.find((i) => /cherry tomatoes/i.test(i.title));
console.log(`Testing with: ${pottery?.title} (${pottery?.intent})`);
if (!pottery || !tomatoes)
	throw new Error('Needs the pottery and cherry tomato items (check-intents / check-reshuffle).');

const { focus } = await call('GET', '/api/focus');
for (const f of focus) await call('POST', '/api/focus/pause', { itemId: f.id });
console.log(`Paused for the test: ${focus.map((f) => f.title).join(', ') || 'nothing'}`);

console.log('\n===== 1. START (not confirmed yet) =====');
const started = await call('POST', '/api/focus/decide', { itemId: pottery.id, decision: 'start' });
console.log(`  status: ${started.status}`);
console.log(`  card: ${started.confirm ? started.confirm.message : '(none: already confirmed)'}`);
await wait(3000);
console.log(
	`  roadmap yet: ${(await call('GET', `/api/items/${pottery.id}/roadmap`)).roadmap ? 'yes' : 'no (waits for confirm)'}`
);

console.log('\n===== 2. CONFIRM AS IS =====');
const confirmed = await call('PUT', `/api/items/${pottery.id}/understanding`, {});
console.log(`  planning: ${confirmed.planning}`);
let roadmap = null;
for (let i = 0; i < 36 && !roadmap; i++) {
	await wait(5000);
	const res = await call('GET', `/api/items/${pottery.id}/roadmap`);
	if (res.planError) throw new Error(`Planning failed: ${res.planError}`);
	roadmap = res.roadmap;
}
if (roadmap) {
	console.log(`  Goal: ${roadmap.roadmap.goal}`);
	for (const m of roadmap.milestones) {
		console.log(`  ${m.title}`);
		for (const s of m.steps) console.log(`    ${s.kind === 'proof' ? '★' : '-'} ${s.title}`);
	}
} else console.log('  no roadmap appeared: check the dev server log for [roadmap]');

console.log('\n===== 3. CORRECT A GUESS =====');
const before = await call('GET', `/api/items/${tomatoes.id}/understanding`);
console.log(`  before: ${before.message}`);
const corrected = await call('PUT', `/api/items/${tomatoes.id}/understanding`, {
	intent: 'tend',
	practiceKind: 'real_world'
});
console.log(`  after:  ${corrected.understanding.message} (planning: ${corrected.planning})`);

await call('POST', '/api/focus/pause', { itemId: pottery.id });
for (const f of focus) await call('POST', '/api/focus/decide', { itemId: f.id, decision: 'start' });
console.log(`\nRestored Focus: ${focus.map((f) => f.title).join(', ') || 'nothing'}`);

console.log('\n===== MEMORIES =====');
await wait(1000);
const { memories } = await call('GET', '/api/memories');
for (const m of memories.slice(0, 3)) console.log(`${m.type}: ${m.summary}`);
