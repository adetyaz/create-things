// Roadmap goals + proving grounds live check (npm run dev running, migration 0008 applied):
//   node.exe scripts/check-goals.mjs
// Makes roadmaps for the jazz piano and AWS items from check-intents.mjs, shows the goal options and
// proving grounds, then switches the jazz goal to its second option and shows the new plan.
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

async function freshRoadmap(itemId, after) {
	for (let i = 0; i < 36; i++) {
		await wait(5000);
		const { roadmap, planError } = await call('GET', `/api/items/${itemId}/roadmap`);
		if (planError) throw new Error(`Planning failed: ${planError}`);
		if (roadmap && roadmap.roadmap.createdAt !== after) return roadmap;
	}
	throw new Error('No new roadmap appeared. Check the dev server log for [roadmap] errors.');
}

function show(view) {
	console.log(`  Goal: ${view.roadmap.goal}`);
	for (const [i, option] of (view.roadmap.goalOptions ?? []).entries())
		console.log(`    option ${i + 1}: ${option}`);
	for (const m of view.milestones) {
		console.log(`  ${m.title}`);
		for (const s of m.steps) {
			const proof = s.kind === 'proof';
			console.log(`    ${proof ? '★ PROVE IT:' : '-'} ${s.title} (${s.minutes} min)`);
			if (proof && s.searchTerms?.length)
				console.log(`        search: ${s.searchTerms.join('; ')}`);
		}
	}
}

const { items } = await call('GET', '/api/items');
const pick = (re) => items.find((i) => re.test(i.title));
const jazz = pick(/jazz piano chords/i);
const aws = pick(/AWS Cloud Practitioner/i);
if (!jazz || !aws)
	throw new Error('Run node.exe scripts/check-intents.mjs first (needs the jazz and AWS items).');

const made = {};
for (const item of [jazz, aws]) {
	const before = (await call('GET', `/api/items/${item.id}/roadmap`)).roadmap?.roadmap.createdAt;
	await call('POST', `/api/items/${item.id}/roadmap`);
	made[item.id] = await freshRoadmap(item.id, before);
	console.log(`\n===== ${item.title} (${item.intent}, ${item.practiceKind}) =====`);
	show(made[item.id]);
}

const options = made[jazz.id].roadmap.goalOptions ?? [];
if (options.length < 2) throw new Error('Fewer than 2 goal options came back.');
console.log(`\n===== SWITCH JAZZ GOAL to option 2 =====`);
const switched = await call('PATCH', `/api/items/${jazz.id}/roadmap`, { goal: options[1] });
console.log(`  ${switched.mode} queued`);
show(await freshRoadmap(jazz.id, made[jazz.id].roadmap.createdAt));
