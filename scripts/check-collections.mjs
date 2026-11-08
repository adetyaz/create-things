// Collections, site ids and copies (npm run dev running, migration 0015 applied):
//   node.exe scripts/check-collections.mjs
// Saves a pretend X bookmark as a copy (no analysis), saves it again (same item, no duplicate),
// puts it in a "folder" collection, links that collection to your first Focus goal, and reads
// the goal's references. Undoes the save at the end (the empty collection stays; harmless).
// Cost: nothing (copies aren't analysed; no AI, credits or Walrus).
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}

const copy = {
	captureType: 'url',
	sourceUrl: 'https://x.com/example/status/1850000000000000001',
	note: 'A grainy two-colour riso poster',
	analyse: false,
	external: { source: 'x', id: '1850000000000000001' },
	collection: { source: 'x', externalId: 'folder-riso', title: 'Riso (X folder)' }
};
const first = await call('POST', '/api/items', copy);
console.log(`Copy: ${first.status} ${first.data.item.status}, analysis: ${first.data.analysis}`);
const again = await call('POST', '/api/items', copy);
console.log(
	`Same post again: ${again.data.analysis}, same item: ${again.data.item.id === first.data.item.id}`
);

const { data: list } = await call('GET', '/api/collections');
const folder = list.collections.find((c) => c.title === 'Riso (X folder)');
console.log(`Collection: "${folder.title}" (${folder.source}) holds ${folder.count}`);

const { data: focus } = await call('GET', '/api/focus');
const goal = focus.focus?.[0];
if (goal) {
	const linked = await call('PUT', `/api/collections/${folder.id}`, { goalItemId: goal.id });
	console.log(`Linked to "${goal.title}": ${linked.status}`);
	const { data: refs } = await call('GET', `/api/items/${goal.id}/references`);
	console.log(`Its references now: ${refs.references.map((r) => r.title).join(', ')}`);
	await call('PUT', `/api/collections/${folder.id}`, { goalItemId: null });
}

const undo = await call('DELETE', `/api/items/${first.data.item.id}`);
console.log(`Cleaned up: ${undo.status}`);
