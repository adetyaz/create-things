// Imports (npm run dev running, migration 0015 applied):
//   node.exe scripts/check-imports.mjs
// Imports 3 pretend X bookmarks into a folder (as references, not analysed), imports them again
// (nothing duplicated), finishes the import (one `expansion` memory: what came in and what it's
// mostly about), shows what analysing them would cost, then removes the 3 test items.
// Cost: no AI, no credits; Walrus: 1 `remember` (5 points) for the import's memory.
// To try the real thing: open x.com/i/bookmarks or a Pinterest board with the extension and
// press Import in the bar at the top.
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}

const batch = {
	source: 'x',
	collection: { externalId: 'folder:check', title: 'Check folder' },
	items: [1, 2, 3].map((n) => ({
		url: `https://x.com/example/status/19000000000000000${n}`,
		externalId: `19000000000000000${n}`,
		text: ['Riso poster with grain', 'Two-colour riso print', 'Grainy riso poster layout'][n - 1]
	}))
};
const first = await call('POST', '/api/imports', batch);
console.log(`Import: ${first.status} added ${first.data.added}, already ${first.data.already}`);
const again = await call('POST', '/api/imports', batch);
console.log(`Again: added ${again.data.added}, already ${again.data.already} (no duplicates)`);

const done = await call('POST', '/api/imports/done', {
	collectionId: first.data.collectionId,
	count: first.data.added
});
console.log(`Memory: ${done.data.summary}`);
console.log(
	`Analysing them would cost ${done.data.analysis.costAll} credits (${done.data.analysis.waiting} × ${done.data.analysis.costEach}); not done here.`
);

const { data } = await call('GET', `/api/collections/${first.data.collectionId}`);
for (const item of data.items) await call('DELETE', `/api/items/${item.id}`);
console.log(`Cleaned up ${data.items.length} test items.`);
