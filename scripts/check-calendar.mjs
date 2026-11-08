// Calendar (npm run dev running, migration 0015 applied):
//   node.exe scripts/check-calendar.mjs "<your calendar's private ICS link>"
//   node.exe scripts/check-calendar.mjs                 (status and your feed link only)
// Connects the ICS link (reads busy times now; only start/end are kept, never titles), shows how
// many busy times are ahead, flags today's blocks that clash, and makes your private feed link
// (subscribe to it in your calendar app to see your blocks with a 10-minute alert).
// Google: Settings → your calendar → "Secret address in iCal format". Apple: share → public link.
// Cost: nothing (no AI, credits or Walrus). Disconnect again with: --disconnect
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}

const arg = process.argv[2];
if (arg === '--disconnect') {
	console.log((await call('PUT', '/api/calendar', { icsUrl: null })).data);
	process.exit(0);
}
if (arg) {
	const { status, data } = await call('PUT', '/api/calendar', { icsUrl: arg });
	console.log(`Connect: ${status}`, data?.message ?? `${data?.busy} busy times in the next 3 weeks`);
}

console.log('\n===== STATUS =====');
console.log(JSON.stringify((await call('GET', '/api/calendar')).data, null, 2));

console.log("\n===== TODAY'S BLOCKS =====");
const { data: day } = await call('GET', '/api/plan/day');
if (!day.blocks.length) console.log('No blocks planned today.');
day.blocks.forEach((b, i) => {
	const clash = day.clashes?.[i];
	console.log(
		`${b.startTime ?? b.anchor ?? '(no time)'}  ${b.step.title}${clash ? `  ⚠ clashes with busy ${clash.busy}` : ''}`
	);
});

console.log('\n===== YOUR FEED =====');
const { data: feed } = await call('POST', '/api/calendar/feed', {});
console.log(`Subscribe to: ${feed.webcal}`);
const ics = await fetch(feed.feedUrl).then((r) => r.text());
console.log(`It has ${(ics.match(/BEGIN:VEVENT/g) ?? []).length} blocks.`);
console.log(
	'(The feed link only works where your calendar app can reach this address: after deploying.)'
);
