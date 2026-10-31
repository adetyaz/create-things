// Reshuffle + fit-it-in live check (npm run dev running; run check-plan.mjs first so blocks exist):
//   node.exe scripts/check-reshuffle.mjs
// Moves two of tomorrow's blocks to yesterday to fake a missed day, then: reshuffle offers, never
// miss twice, a busy week, and fit-it-in for one related and one unrelated new idea.
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

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const showDay = (label, view) => {
	console.log(`${label} (${view.day}):`);
	for (const b of view.blocks) {
		console.log(
			`  #${b.position} ${b.intention}${b.missed ? ' [missed]' : ''}${b.step.done ? ' [done]' : ''}`
		);
	}
	console.log(`  Today would show: ${view.first ? view.first.step.title : 'nothing'}`);
};

console.log('===== FAKE A MISSED DAY =====');
let upcoming = [];
for (let i = 1; i <= 7 && upcoming.length < 2; i++) {
	upcoming.push(
		...(await call('GET', `/api/plan/day?date=${day(i)}`)).blocks.filter((b) => !b.step.done)
	);
}
if (upcoming.length < 2)
	throw new Error('Need 2 planned blocks: run node.exe scripts/check-plan.mjs first.');
for (const b of upcoming.slice(0, 2)) {
	await call('PATCH', `/api/plan/slots/${b.slotId}`, { day: day(-1) });
	console.log(`Moved to yesterday: ${b.step.title}`);
}

console.log('\n===== RESHUFFLE OFFERS =====');
const offers = await call('GET', '/api/plan/reshuffle');
for (const m of offers.missed) {
	console.log(
		`  Missed ${m.day}: ${m.step.title} -> suggested ${m.suggestion.day} ${m.suggestion.startTime ?? m.suggestion.anchor ?? ''}`
	);
}
console.log(`  Never miss twice: ${offers.neverMissTwice ? offers.neverMissTwice.message : 'no'}`);

const first = offers.neverMissTwice?.slotId;
const applied = await call('POST', '/api/plan/reshuffle', {
	firstToday: first,
	moves: offers.missed
		.filter((m) => m.slotId !== first)
		.map((m) => ({ slotId: m.slotId, ...m.suggestion }))
});
console.log(`Applied: moved ${applied.moved}`);
showDay('Today', await call('GET', '/api/plan/day'));

console.log('\n===== BUSY WEEK (only 1 block free) =====');
const busy = await call('POST', '/api/plan/busy', {
	blocks: [{ day: day(1), startTime: '07:00' }]
});
console.log(`  ${busy.message}`);
for (const k of busy.keep) console.log(`  Keeps: ${k.intention ?? '(empty)'}`);
console.log('  (not applied, so your week stays as it is)');

console.log('\n===== FIT IT IN =====');
const ideas = [
	'Practise ii-V-I in all 12 keys over a backing track',
	'Grow cherry tomatoes on my balcony'
];
for (const note of ideas) {
	const { item } = await call('POST', '/api/items', { captureType: 'note', note, title: note });
	const fit = await call('POST', '/api/plan/fit', { itemId: item.id });
	console.log(`\nIdea: ${note}`);
	console.log(
		`  Related: ${fit.related ? `${fit.related.title} (${fit.related.score})` : 'none close enough'}`
	);
	console.log(`  Scores: ${fit.candidates.map((c) => `${c.title} ${c.score}`).join(' | ')}`);
	for (const o of fit.offers) console.log(`  [${o.choice}] ${o.label}`);
	const pick =
		fit.offers.find((o) => o.choice === 'add_step') ?? fit.offers.find((o) => o.choice === 'park');
	const result = await call('PUT', '/api/plan/fit', {
		itemId: item.id,
		choice: pick.choice,
		relatedItemId: pick.relatedItemId,
		parkUntil: pick.parkUntil
	});
	console.log(`  Applied: ${JSON.stringify(result)}`);
}

console.log('\n===== MEMORIES =====');
const { memories } = await call('GET', '/api/memories');
for (const m of memories.slice(0, 4)) console.log(`${m.type} [${m.status}]: ${m.summary}`);
