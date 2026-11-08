// Pomodoro sessions and the weekly digest (npm run dev running, migration 0015 applied):
//   node.exe scripts/check-digest-week.mjs
// Starts a focus session on your first Focus item's current step, ends it straight away with a
// note (too short to feed the pet; a real 25-minute one is a meal, 10+ minutes a snack; the note
// goes into your journal), then shows your last 7 days as the weekly digest.
// Cost: nothing (no AI, credits or Walrus). Leaves one short session and one journal note.
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}

console.log('===== POMODORO =====');
const { data: focus } = await call('GET', '/api/focus');
const item = focus.focus?.[0];
const stepId = item
	? (await call('GET', `/api/items/${item.id}/roadmap`)).data?.roadmap?.currentStep?.id
	: undefined;
const started = await call('POST', '/api/pomodoro', stepId ? { stepId } : {});
console.log(`Start: ${started.status}, focus length ${started.data.minutes} min`);
const ended = await call('POST', `/api/pomodoro/${started.data.session.id}/end`, {
	note: 'Tried the check script session'
});
console.log(
	`End: ${ended.status}, ${ended.data.minutes} min, fed=${JSON.stringify(ended.data.fed)} (null: under 10 minutes)`
);

console.log('\n===== YOUR WEEK =====');
const { data: week } = await call('GET', '/api/digest');
console.log(`${week.from} → ${week.to}`);
console.log(week.headline);
for (const line of week.lines) console.log(`  ${line}`);
