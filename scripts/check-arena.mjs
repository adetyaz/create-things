// Connections and Are.na (npm run dev running, migration 0015 applied):
//   node.exe scripts/check-arena.mjs                 Connections status (free)
//   node.exe scripts/check-arena.mjs --channels      your Are.na channels (after connecting)
//   node.exe scripts/check-arena.mjs --bring <id> "<title>" [reference|triage|shortlist]
//   node.exe scripts/check-arena.mjs --weekly        your weekly "what you're drawn to" memory
// To connect Are.na: set SOURCE_TOKEN_KEY, ARENA_CLIENT_ID and ARENA_CLIENT_SECRET in .env
// (needs-input.md K2, K8), restart, then open http://localhost:5173/api/sources/arena/connect
// in your browser and say yes.
// Cost: no AI, no credits. --bring: one `expansion` memory (Walrus remember, 5 points) if blocks
// came in. --weekly: one `expansion` memory if you saved anything into collections this week.
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}
const [flag, ...rest] = process.argv.slice(2);

if (flag === '--channels') {
	const { status, data } = await call('GET', '/api/sources/arena/channels');
	if (status !== 200) throw new Error(`${status} ${data?.message}`);
	console.log(`Are.na: ${data.user.name}`);
	for (const c of data.channels) {
		console.log(
			`${c.id}  ${c.title} (${c.blocks ?? '?'} blocks)${c.collectionId ? ` → brought in as ${c.mode}` : ''}`
		);
	}
} else if (flag === '--bring') {
	const [id, title, mode = 'reference'] = rest;
	const { status, data } = await call('POST', '/api/sources/arena/channels', {
		id: Number(id),
		title,
		mode
	});
	console.log(
		status,
		data?.message ?? `${data.added} new, ${data.already} known. ${data.summary ?? ''}`
	);
} else if (flag === '--weekly') {
	console.log(JSON.stringify((await call('POST', '/api/dev/cron?weekly=1')).data, null, 2));
} else {
	const { data } = await call('GET', '/api/sources');
	for (const a of data.accounts) {
		console.log(
			`${a.label}: ${a.connected ? `connected${a.lastSyncAt ? `, last sync ${a.lastSyncAt}` : ''}` : a.available ? 'not connected (ready to connect)' : 'keys missing (needs-input.md)'}`
		);
		console.log(`  brings: ${a.brings}\n  sends: ${a.sends}`);
	}
	console.log(`Calendar link: ${data.calendarLink.connected ? 'connected' : 'not connected'}`);
	console.log(
		`Extension devices: ${data.places[0].devices.map((d) => `${d.label} (last used ${d.lastUsedAt ?? 'never'})`).join(', ') || 'none'}`
	);
}
