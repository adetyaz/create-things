// The pet on the server (npm run dev running):
//   node.exe scripts/check-pet.mjs                 adopt one if needed, show its mood, tour the moods
//   node.exe scripts/check-pet.mjs --step <id>     also mark that step done and see the pet eat
// Without --step it changes nothing lasting: the mood tour pretends the last meal was days ago,
// then puts it back. Lists your Focus items' next steps so you can pick one for --step.
// Cost: nothing (no AI, credits or Walrus). With --step: a step that finishes a milestone also
// re-plans the rest (3 credits, 1 AI call); the list below warns which ones do.
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}
function show(view) {
	const { pet, mood, why, next, today, comingHome, history } = view;
	console.log(`${pet.name} (${pet.breed.replace('_', ' ')}, ${pet.personality}): ${mood}`);
	console.log(`  Why: ${why}`);
	if (next) console.log(`  Next: ${next}`);
	if (comingHome) console.log(`  Coming home: ${comingHome.done} of ${comingHome.needed} days`);
	console.log(`  Today: ate ${today.eaten} of ${today.limit}${today.full ? ' (full)' : ''}`);
	console.log(
		`  History: ${history.length ? history.map((h) => `${h.label} (${h.size})`).join(' · ') : 'nothing yet'}`
	);
}

console.log('===== THE PET =====');
let { data } = await call('GET', '/api/pet');
if (!data.pet) {
	const adopted = await call('POST', '/api/pet', {
		species: 'dog',
		breed: 'golden_retriever',
		name: 'Mochi'
	});
	console.log(`No pet yet: adopted one (${adopted.status}).`);
	data = adopted.data;
}
show(data.pet);
const startDays = data.pet.daysWithoutFood;

console.log('\n===== MOOD TOUR (pretend the last meal was…) =====');
for (const days of [4, 8, 15, 31, 61]) {
	const { data: tour } = await call('POST', '/api/dev/pet', { daysAgo: days });
	console.log(`${String(days).padStart(2)} days ago → ${tour.pet.mood}: ${tour.pet.why}`);
}
await call('POST', '/api/dev/pet', { daysAgo: startDays });
console.log(`(put back to ${startDays} day(s) without food)`);

const stepAt = process.argv.indexOf('--step');
if (stepAt > 0) {
	const stepId = process.argv[stepAt + 1];
	console.log('\n===== FEED: MARK A STEP DONE =====');
	const done = await call('POST', `/api/steps/${stepId}/complete`);
	console.log(`Step done: ${done.status}, fed: ${JSON.stringify(done.data?.fed)}`);
	const again = await call('POST', `/api/steps/${stepId}/complete`);
	console.log(`Same step again: fed ${JSON.stringify(again.data?.fed)} (null: a step feeds once)`);
	show((await call('GET', '/api/pet')).data.pet);
} else {
	console.log('\n===== STEPS YOU COULD MARK DONE (--step <id>) =====');
	const { data: focus } = await call('GET', '/api/focus');
	for (const item of focus.focus ?? []) {
		const { data: r } = await call('GET', `/api/items/${item.id}/roadmap`);
		const view = r?.roadmap;
		const step = view?.currentStep;
		if (!step) continue;
		const left = view.milestones
			.find((m) => m.steps.some((s) => s.id === step.id))
			?.steps.filter((s) => !s.doneAt).length;
		console.log(`${item.title}: "${step.title}"\n  ${step.id}`);
		if (left === 1) console.log('  (finishes a milestone: re-plans the rest, 3 credits)');
	}
}
