// The extension toast's server side (npm run dev running):
//   node.exe scripts/check-saving.mjs
// Saves a note as a reference, switches it to a to-do and back, then undoes it; saves another and
// undoes it straight away (its analysis finds it gone, or is refunded); checks a bad id is refused.
// Cost: 2 credits, 1–2 AI calls (the second analysis only if it starts before the undo; refunded).
// Walrus: none (references make no goal memory, and the switch back happens before any is made).
const BASE = 'http://localhost:5173';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}
async function analysed(id) {
	for (let i = 0; i < 40; i++) {
		const { data } = await call('GET', `/api/items/${id}`);
		if (data.analysis || data.item.analysisError) return data;
		await wait(3000);
	}
	throw new Error('Analysis did not finish');
}

console.log('===== SAVE AS A REFERENCE =====');
const saved = await call('POST', '/api/items', {
	captureType: 'note',
	note: 'Grainy two-colour riso poster with oversized type',
	asReference: true
});
const id = saved.data.item.id;
console.log(`Saved with status: ${saved.data.item.status}`);
const done = await analysed(id);
console.log(`After analysis: ${done.item.status}, "${done.item.title}"`);

console.log('\n===== SWITCH (the toast\'s "Make it a to-do instead" and back) =====');
const todo = await call('PUT', `/api/items/${id}/reference`, { reference: false });
console.log(`To-do: ${todo.status} → status ${todo.data.item?.status} (analysed, so "ready")`);
const back = await call('PUT', `/api/items/${id}/reference`, { reference: true });
console.log(`Reference again: ${back.status} → status ${back.data.item?.status}`);

console.log('\n===== UNDO =====');
const undo = await call('DELETE', `/api/items/${id}`);
console.log(`Undo: ${undo.status} ${JSON.stringify(undo.data)}`);
const gone = await call('GET', `/api/items/${id}`);
console.log(`Reading it again → ${gone.status} (404 means removed)`);

console.log('\n===== UNDO RIGHT AWAY (analysis may still be running) =====');
const quick = await call('POST', '/api/items', { captureType: 'note', note: 'Learn screen printing' });
const quickUndo = await call('DELETE', `/api/items/${quick.data.item.id}`);
console.log(`Undo: ${quickUndo.status} ${JSON.stringify(quickUndo.data)}`);

console.log('\n===== REFUSED =====');
const missing = await call('DELETE', '/api/items/00000000-0000-4000-8000-000000000000');
console.log(`Unknown item → ${missing.status} ${missing.data?.message}`);
const badBody = await call('PUT', `/api/items/${id}/reference`, { reference: 'yes' });
console.log(`Bad body → ${badBody.status}`);
