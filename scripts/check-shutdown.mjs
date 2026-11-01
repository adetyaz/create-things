// Daily shutdown live check (npm run dev running): node.exe scripts/check-shutdown.mjs
// Shows today's wrap-up, accepts its suggestions (moves today's unfinished blocks, ranks tomorrow's
// top 3) and saves one session summary.
// Cost: 0 credits, 0 AI calls. Walrus: 1 `analyze` for the session summary (10 points).
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

const view = await call('GET', '/api/plan/shutdown');
console.log(
	`===== WRAP UP ${view.today} (shutdown at ${view.shutdownTime}, due now: ${view.due}) =====`
);
console.log(`Done today: ${view.done.length ? view.done.join('; ') : 'nothing yet'}`);
console.log('What moves:');
if (!view.moves.length) console.log('  (nothing left over)');
for (const m of view.moves) console.log(`  ${m.step.title} → ${m.suggestion.day}`);
console.log("Tomorrow's top 3 (pre-filled):");
if (!view.tomorrow.length) console.log('  (nothing to suggest: start an item or plan the week)');
view.tomorrow.forEach((t, i) =>
	console.log(
		`  #${i + 1} ${t.title}  (${t.itemTitle})${i === 0 && t.twoMinute ? `\n      2-minute start: ${t.twoMinute}` : ''}`
	)
);

const result = await call('POST', '/api/plan/shutdown', {
	moves: view.moves.map((m) => ({ slotId: m.slotId, ...m.suggestion })),
	tomorrow: view.tomorrow.map((t) => t.stepId),
	note: 'Good focus in the morning, drifted after lunch'
});
console.log(`\nSaved to memory: ${result.summary}`);

const tomorrowDay = new Date(Date.parse(`${view.today}T00:00:00Z`) + 86400000)
	.toISOString()
	.slice(0, 10);
const tomorrow = await call('GET', `/api/plan/day?date=${tomorrowDay}`);
console.log(
	`\nTomorrow (${tomorrow.day}) now opens with: ${tomorrow.first ? tomorrow.first.intention : '(nothing planned)'}`
);
