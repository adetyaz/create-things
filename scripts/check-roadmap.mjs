// Roadmap live check (npm run dev must be running): node.exe scripts/check-roadmap.mjs [itemId]
// Shows the roadmap, finishes milestone 1, waits for the re-plan, then shows the result and plan memories.
const BASE = 'http://localhost:5173';
const ID = process.argv[2] ?? 'e257e7ff-f415-4552-841b-c618568b2a96';
const get = (p) => fetch(BASE + p).then((r) => r.json());
const post = (p) => fetch(BASE + p, { method: 'POST' }).then((r) => r.json());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const show = (rm) => {
	console.log(`steps done: ${rm.doneSteps}/${rm.totalSteps}`);
	for (const m of rm.milestones) {
		console.log(`\n${m.done ? '[x]' : '[ ]'} ${m.title}`);
		for (const s of m.steps) {
			console.log(`   ${s.doneAt ? 'x' : '-'} ${s.title} (${s.minutes} min)`);
			console.log(
				`       2-min: ${s.twoMinute ?? '-'} | search: ${(s.searchTerms ?? []).join('; ')} | tools: ${(s.tools ?? []).join(', ')}`
			);
		}
	}
};

let { roadmap } = await get(`/api/items/${ID}/roadmap`);
for (let i = 0; !roadmap && i < 36; i++) {
	if (i === 0) console.log('No roadmap yet, waiting for the job (up to 3 min)...');
	await wait(5000);
	({ roadmap } = await get(`/api/items/${ID}/roadmap`));
}
if (!roadmap)
	throw new Error('No roadmap appeared. Check the dev server log for [roadmap] errors.');

console.log('===== BEFORE =====');
show(roadmap);
const before = roadmap.milestones.map((m) => m.title).join(' | ');

console.log('\n===== COMPLETING MILESTONE 1 =====');
let replanning = false;
for (const s of roadmap.milestones[0].steps) {
	const r = await post(`/api/steps/${s.id}/complete`);
	console.log(`${s.title} -> milestoneDone=${r.milestoneDone} replanning=${r.replanning}`);
	replanning ||= r.replanning;
}

if (replanning) {
	console.log('\nWaiting for the re-plan (up to 3 min)...');
	for (let i = 0; i < 36; i++) {
		await wait(5000);
		({ roadmap } = await get(`/api/items/${ID}/roadmap`));
		if (roadmap.milestones.map((m) => m.title).join(' | ') !== before) break;
	}
}

console.log('\n===== AFTER =====');
show(roadmap);

const { memories } = await get('/api/memories');
console.log('\n===== PLAN MEMORIES =====');
for (const m of memories.filter((m) => m.type === 'plan' || m.type === 'plan_change')) {
	console.log(`${m.type} [${m.status}]: ${m.summary}`);
}
