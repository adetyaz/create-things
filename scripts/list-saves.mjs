// Your latest saves, one line each (npm run dev running):
//   node.exe scripts/list-saves.mjs        (latest 15)
//   node.exe scripts/list-saves.mjs 40     (latest 40)
// Shows when, status, how it was saved, whether it's analysed, title, site and the id (for
// POST /api/items/<id>/analyze or DELETE /api/items/<id>).
// Cost: nothing (one database read; no AI, credits or Walrus).
const BASE = 'http://localhost:5173';
const count = Number(process.argv[2]) || 15;

const res = await fetch(`${BASE}/api/items`);
if (!res.ok) throw new Error(`GET /api/items failed (${res.status})`);
const { items } = await res.json();

for (const item of items.slice(0, count)) {
	const when = item.savedAt.slice(5, 16).replace('T', ' ');
	// Only new saves (inbox, reference) wait for analysis; course imports and the rest never do.
	const waiting = ['inbox', 'reference'].includes(item.status) && !item.size;
	const analysed = item.analysisError
		? 'failed'
		: item.size
			? 'analysed'
			: waiting
				? 'not analysed'
				: '—';
	const note = item.note ? `  “${item.note.replace(/\s+/g, ' ').slice(0, 50)}”` : '';
	console.log(
		`${when}  ${item.status.padEnd(9)} ${item.captureType.padEnd(10)} ${analysed.padEnd(12)} ` +
			`${item.title.slice(0, 50)}${item.platform ? `  (${item.platform})` : ''}${note}\n` +
			`             ${item.id}`
	);
}
console.log(`\n${Math.min(count, items.length)} of ${items.length} shown (newest first).`);
