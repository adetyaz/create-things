// Last live checks for 24e (confirm card) and 24h (courses). npm run dev running:
//   node.exe scripts/check-finish.mjs
// A. Corrects a guessed intent → the memory says it was a correction.
// B. Picks a month goal that isn't confirmed → the month plan returns its confirm card.
// C. Proposes a week for the latest sample guitar course → blocks before a class are marked.
// Your month goals are put back at the end.
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
const iso = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

async function capture(note) {
	const { item } = await call('POST', '/api/items', { captureType: 'note', note, title: note });
	for (let i = 0; i < 40; i++) {
		const found = await call('GET', `/api/items/${item.id}`);
		if (found.item.status !== 'inbox' || found.item.analysisError) return found.item;
		await wait(3000);
	}
	throw new Error(`Analysis didn't finish for "${note}"`);
}

const monthBefore = await call('GET', '/api/plan/month');
const originalGoals = monthBefore.goals.map((g) => g.id);

console.log('===== A. CORRECT A GUESS =====');
const chess = await capture('Get better at chess');
const card = await call('GET', `/api/items/${chess.id}/understanding`);
console.log(`  guessed: ${card.message}`);
const corrected = card.intent.id === 'habit' ? 'learn' : 'habit';
const confirmed = await call('PUT', `/api/items/${chess.id}/understanding`, {
	intent: corrected,
	goal: 'Play one game of chess every day'
});
console.log(`  corrected to ${corrected}: ${confirmed.understanding.message}`);
await wait(1000);
const memory = (await call('GET', '/api/memories')).memories.find((m) =>
	m.summary.includes('Get better at chess')
);
console.log(`  memory: ${memory?.summary ?? '(not found)'}`);

console.log('\n===== B. MONTH PICK RETURNS CARDS =====');
const spanish = await capture('Learn basic Spanish before my trip in March');
const planned = await call('POST', '/api/plan/month', {
	goalItemIds: [...originalGoals.slice(0, 2), spanish.id]
});
console.log(`  cards to confirm: ${planned.toConfirm.length}`);
for (const c of planned.toConfirm) console.log(`    ${c.message}`);

console.log('\n===== C. A WEEK AROUND THE CLASSES =====');
const { items } = await call('GET', '/api/items');
const course = items.find((i) => i.intent === 'course' && /beginner guitar/i.test(i.title));
if (!course) throw new Error('Run node.exe scripts/check-course.mjs once first.');
await call('POST', '/api/plan/month', { goalItemIds: [course.id] });
const week = await call('POST', '/api/plan/week', {
	blocks: [
		{ day: iso(1), startTime: '09:00' },
		{ day: iso(2), startTime: '18:00' },
		{ day: iso(3), anchor: 'after dinner' },
		{ day: iso(4), startTime: '18:00' }
	]
});
for (const c of week.classes) console.log(`  CLASS ${c.date}: ${c.unit}`);
for (const b of week.blocks) {
	console.log(
		`  ${b.intention ?? `${b.day}: (empty)`}${b.beforeClass ? `  ← before the ${b.beforeClass.date} class` : ''}`
	);
}

if (originalGoals.length) await call('POST', '/api/plan/month', { goalItemIds: originalGoals });
console.log(
	`\nMonth goals put back: ${monthBefore.goals.map((g) => g.title).join(', ') || '(none were set)'}`
);
