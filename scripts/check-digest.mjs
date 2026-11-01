// Daily digest + retry live check, run on a day after small events were saved (npm run dev running):
//   node.exe scripts/check-digest.mjs
// Saving any memory rolls earlier days' small events into one digest memory and retries failed
// sends. This saves a skip (itself waiting for today's digest) to trigger both.
// Cost: 0 credits, 0 AI calls. Walrus: 1 `remember` per earlier day's digest (5 points each),
// plus 1 `analyze` per failed memory retried (10 points each).
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

const before = (await call('GET', '/api/memories')).memories;
const waiting = before.filter((m) => m.delivery === 'digest' && !m.digestId);
const failed = before.filter(
	(m) => m.status === 'queued' && m.lastError && m.delivery !== 'digest'
);
console.log(`Small events waiting for a digest: ${waiting.length}`);
for (const w of waiting) console.log(`  ${w.createdAt.slice(0, 10)}  ${w.summary.slice(0, 80)}`);
console.log(`Failed sends waiting for a retry: ${failed.length}`);
for (const f of failed) console.log(`  ${f.summary.slice(0, 80)}  (${f.lastError})`);

const { items } = await call('GET', '/api/items');
const skippable = items.find((i) => ['shortlist', 'ready', 'paused'].includes(i.status));
if (!skippable) throw new Error('No Shortlist, Ready or Paused item to skip.');
await call('POST', '/api/focus/decide', { itemId: skippable.id, decision: 'not_today' });
console.log(
	`\nTriggered by skipping "${skippable.title}" (today's event waits for tomorrow's digest)`
);

let after = [];
for (let i = 0; i < 15; i++) {
	await wait(3000);
	after = (await call('GET', '/api/memories')).memories;
	const pending = after.filter(
		(m) =>
			(m.sourceType === 'digest' && m.status === 'queued') ||
			failed.some((f) => f.id === m.id && m.status === 'queued')
	);
	if (pending.length === 0 && after.some((m) => m.sourceType === 'digest')) break;
}

console.log('\n===== DIGESTS =====');
const digests = after.filter((m) => m.sourceType === 'digest');
if (!digests.length) console.log('  none made (no small events from an earlier day)');
for (const d of digests) {
	const rolled = after.filter((m) => m.digestId === d.id).length;
	console.log(
		`  [${d.status}, ${d.delivery}, ${d.walrusJobId?.split(',').length ?? 0} Walrus job] ${d.summary}`
	);
	console.log(`    rolled up ${rolled} small events`);
}

console.log('\n===== RETRIES =====');
for (const f of failed) {
	const now = after.find((m) => m.id === f.id);
	console.log(`  ${now?.status ?? 'gone'}: ${f.summary.slice(0, 80)}`);
}
