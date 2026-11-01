// Next-thing suggestions live check (npm run dev running): node.exe scripts/check-next.mjs
// 1. Asks what to do after the Beginner Guitar course (nothing changes).
// 2. Finishes the walrus-memory GitHub test item: marks it done, remembers what it built, suggests next.
// Cost: 2 credits, 2 AI calls, 2 Walrus recalls, 1 `analyze` (the finished item's lesson, 10 points),
// and first-time embeds for up to 13 items each (then cached).
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

function show(next) {
	if (!next) return console.log('  (nothing to suggest)');
	console.log(`  Next: ${next.item.title}  [picked by ${next.pickedBy}]`);
	console.log(`  Why: ${next.reason}`);
	console.log(`  Carries over: ${next.carriesOver.join(', ') || '(none listed)'}`);
	for (const a of next.alternatives)
		console.log(`  or: ${a.title}${a.shared.length ? ` (shares ${a.shared.join(', ')})` : ''}`);
}

const { items } = await call('GET', '/api/items');
const guitar = items.find((i) => i.intent === 'course' && /beginner guitar/i.test(i.title));
const walrus = items.find((i) => /walrus-memory/i.test(i.title) && i.status !== 'done');

if (guitar) {
	console.log(`===== WHAT NEXT AFTER "${guitar.title}" (asking only) =====`);
	show((await call('GET', `/api/items/${guitar.id}/next`)).next);
}

if (!walrus) throw new Error('The walrus-memory test item is already finished or missing.');
console.log(`\n===== FINISH "${walrus.title.slice(0, 60)}" =====`);
const done = await call('POST', `/api/items/${walrus.id}/finish`, {
	note: 'Learned how to wire a vector store to an API'
});
console.log(`  ${done.status}`);
show(done.next);

const { memories } = await call('GET', '/api/memories');
const lesson = memories.find(
	(m) => m.type === 'lesson_learned' && m.summary.startsWith('Finished')
);
console.log(`\nMemory: ${lesson?.summary ?? '(not found)'}`);
