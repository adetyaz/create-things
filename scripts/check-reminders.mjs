// Reminders (npm run dev running, migration 0015 applied):
//   node.exe scripts/check-reminders.mjs            what's due now, what's open, why any are held
//   node.exe scripts/check-reminders.mjs --act <id> <action>   done | move | two_minute | dismiss
// What's due depends on the time: blocks near their time, reviews after 11:00, a hungry pet after
// 12:00, shutdown and the weekly plan at your times, never-miss-twice after a missed day. Quiet
// hours (22:00–08:00 by default) hold everything. Each reminder fires once; 3 a day at most.
// Cost: nothing (no AI, credits or Walrus). "done" marks a real step done (and feeds the pet).
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}

const actAt = process.argv.indexOf('--act');
if (actAt > 0) {
	const [id, action] = process.argv.slice(actAt + 1);
	const { status, data } = await call('POST', `/api/reminders/${id}`, { action });
	console.log(`${action} → ${status}`, JSON.stringify(data?.result ?? data?.message ?? null));
	process.exit(0);
}

const { status, data } = await call('GET', '/api/reminders?channel=script');
if (status !== 200) throw new Error(`${status} ${JSON.stringify(data)}`);
console.log(`Limit: ${data.limit.usedToday} of ${data.limit.perDay} used today`);
if (data.held) console.log(`Held back: ${data.held}`);
for (const [label, list] of [
	['New now', data.fresh],
	['Still open today', data.open]
]) {
	console.log(`\n===== ${label} (${list.length}) =====`);
	for (const r of list) {
		console.log(`[${r.kind}] ${r.title}\n  ${r.body}`);
		console.log(`  actions: ${r.actions.map((a) => a.action).join(', ')}\n  id: ${r.id}`);
	}
}
