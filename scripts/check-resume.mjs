// Stop and continue live check (npm run dev running): node.exe scripts/check-resume.mjs
// Finishes the current step of your Focus item, pauses it, starts it again, and shows where the pet
// says you left off.
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

const { focus } = await call('GET', '/api/focus');
if (!focus.length) throw new Error('Nothing in Focus. Start an item first.');
const item = focus[0];
const { roadmap } = await call('GET', `/api/items/${item.id}/roadmap`);
if (!roadmap?.currentStep) throw new Error(`"${item.title}" has no unfinished roadmap steps.`);

await call('POST', `/api/steps/${roadmap.currentStep.id}/complete`);
console.log(`Finished: ${roadmap.currentStep.title}`);
await call('POST', '/api/focus/pause', { itemId: item.id });
console.log(`Paused: ${item.title}`);
const started = await call('POST', '/api/focus/decide', { itemId: item.id, decision: 'start' });
console.log(`Started again: ${started.status}`);
console.log(
	`Pet says: ${started.resumeAt ? started.resumeAt.message : '(nothing: no resume point)'}`
);
if (started.resumeAt?.twoMinute) console.log(`2-minute start: ${started.resumeAt.twoMinute}`);
