// Pet chat live check (npm run dev running): node.exe scripts/check-chat.mjs
// Cost: 4 credits, 4 AI calls (Gemini locally), 4 Walrus recalls (1 point each) and at most 2
// `remember`s (stuck topic, maybe one fact) at 5 points each.
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

function show(title, r) {
	console.log(`\n===== ${title} =====`);
	console.log(`Pet: ${r.reply}`);
	r.memoriesUsed.forEach((m, i) => console.log(`  cited [${i + 1}] ${m.text}`));
	if (!r.memoriesUsed.length) console.log('  (no memories cited)');
	if (r.saved) console.log(`  saved to memory: ${r.saved}`);
	return r;
}

const { items } = await call('GET', '/api/items');
const jazz = items.find((i) => /jazz piano chords/i.test(i.title) && i.status !== 'archived');
if (!jazz) throw new Error('Needs the jazz piano item from check-intents.mjs.');

show(
	"I'M STUCK (break first, then a smaller step or new angle)",
	await call('POST', '/api/chat', {
		mode: 'stuck',
		itemId: jazz.id,
		messages: [
			{ role: 'user', text: "I can't get drop-2 voicings, my hand won't stretch that far" }
		]
	})
);

show(
	'TEACH ME THIS',
	await call('POST', '/api/chat', {
		mode: 'teach',
		itemId: jazz.id,
		messages: [{ role: 'user', text: 'What is a drop-2 voicing, simply?' }]
	})
);

show(
	'PLAIN CHAT (uses what the pet remembers)',
	await call('POST', '/api/chat', {
		messages: [{ role: 'user', text: 'I have 20 minutes tonight. What should I work on?' }]
	})
);

const deleted = show(
	'DELETED MEMORIES STAY HIDDEN',
	await call('POST', '/api/chat', {
		messages: [{ role: 'user', text: 'What was my half-year plan for H2 2026?' }]
	})
);
const leaked = deleted.memoriesUsed.some((m) => /Half-year plan for H2/i.test(m.text));
console.log(`  The deleted "Half-year plan" memory was ${leaked ? 'CITED (bug)' : 'not used'}`);
