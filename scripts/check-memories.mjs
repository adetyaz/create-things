// "What your pet knows" + Walrus cost rules live check (npm run dev running, migration 0012 applied):
//   node.exe scripts/check-memories.mjs            list, cost rules, delete the chess memory
//   node.exe scripts/check-memories.mjs --forget   also forget everything at the end (careful)
// Cost: 0 credits, 0 AI calls. Walrus: 1 `remember` (5 points) for a plan change, a few embeds the
// first time only (then cached), 1 bulk status lookup for the delete. Nothing re-sent.
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

console.log('===== WHAT YOUR PET KNOWS =====');
const before = await call('GET', '/api/memories');
console.log(`${before.memories.length} memories`);
for (const g of before.groups) {
	console.log(`  ${g.label}: ${g.memories.length}`);
	for (const m of g.memories.slice(0, 2)) console.log(`    - ${m.summary.slice(0, 100)}`);
}

console.log('\n===== COST RULES =====');
// Rule 1: a skip is a small event, so it waits for the daily digest instead of going to Walrus now.
const { items } = await call('GET', '/api/items');
const skippable = items.find((i) => ['shortlist', 'ready', 'paused'].includes(i.status));
if (skippable) {
	await call('POST', '/api/focus/decide', { itemId: skippable.id, decision: 'not_today' });
	await wait(1500);
	const skip = (await call('GET', '/api/memories')).memories.find((m) =>
		m.summary.includes(`Skipped "${skippable.title}"`)
	);
	console.log(
		`  Rule 1, skip "${skippable.title}": delivery=${skip?.delivery} (waits for the daily digest)`
	);
}
// Rules 2 + 3: a plan change is one fact, so `remember` with dedupe (5 points, one blob).
const month = await call('GET', '/api/plan/month');
if (month.goals.length) {
	await call('POST', '/api/plan/month', { goalItemIds: month.goals.map((g) => g.id) });
	let change;
	for (let i = 0; i < 10; i++) {
		await wait(2000);
		change = (await call('GET', '/api/memories')).memories.find((m) => m.type === 'plan_change');
		if (change?.status !== 'queued') break;
	}
	console.log(
		`  Rule 2, month plan change: delivery=${change?.delivery}, status=${change?.status}, Walrus jobs=${change?.walrusJobId?.split(',').length ?? 0}`
	);
}
// Rule 4: fit-it-in caches embeddings on items.
const idea = items.find((i) => /spanish/i.test(i.title)) ?? items[0];
const t1 = Date.now();
await call('POST', '/api/plan/fit', { itemId: idea.id });
const first = Date.now() - t1;
const t2 = Date.now();
await call('POST', '/api/plan/fit', { itemId: idea.id });
console.log(
	`  Rule 4, fit-it-in twice for "${idea.title}": ${first} ms, then ${Date.now() - t2} ms (the second reuses cached embeddings)`
);

console.log('\n===== DELETE ONE =====');
const target =
	before.memories.find((m) => m.summary.includes('Get better at chess') && m.status === 'sent') ??
	before.memories.find((m) => m.status === 'sent');
if (!target) throw new Error('No sent memory to delete.');
console.log(`Deleting: ${target.summary.slice(0, 100)}`);
const deleted = await call('DELETE', `/api/memories/${target.id}`);
console.log(
	`  Facts hidden from recall: ${deleted.hiddenFacts} (one bulk lookup, nothing re-sent)`
);
console.log(`  ${deleted.note}`);
const after = await call('GET', '/api/memories');
console.log(
	`  The deleted one is gone from the list: ${!after.memories.some((m) => m.id === target.id)}`
);

if (process.argv.includes('--forget')) {
	console.log('\n===== FORGET EVERYTHING =====');
	const forgot = await call('POST', '/api/memories/forget', { confirm: true });
	console.log(`  Forgot ${forgot.forgotten}. ${forgot.note}`);
	console.log(`  Listed now: ${(await call('GET', '/api/memories')).memories.length}`);
}
