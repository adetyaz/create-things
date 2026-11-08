// Templates, rhythm, rest mode, experiments and onboarding (npm run dev, migration 0015 applied):
//   node.exe scripts/check-onboarding.mjs
// Shows your onboarding variants and templates, suggests types from a sentence (free; a small AI
// call only if no words match), applies the crafts template (every 2 days, reviews off) and reads
// it back in plain words, turns rest mode on and off, and shows experiment results.
// It does NOT post the full onboarding (that would save brain-dump items and analyse them, 2 credits
// each) and puts your rhythm back to what it was at the end.
// Cost: nothing (the suggestion is free; no credits, no Walrus).
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}

const { data: ob } = await call('GET', '/api/onboarding');
console.log(
	`Onboarding: done=${ob.done}, ask=${ob.ask}, up to ${ob.maxTypes} type(s), ${ob.templates.length} templates, pet timeline default ${ob.defaults.leniency}`
);
console.log(`Templates: ${ob.templates.map((t) => t.label).join(' · ')}`);
const breed = ob.species[1].breeds[0];
console.log(`Meet a pet: ${breed.label}: ${breed.personality}. "${breed.voice.savage}"`);

console.log('\n===== DESCRIBE YOURSELF =====');
for (const sentence of [
	'I make silver rings and want to sell them',
	'I want to pass the AWS cloud practitioner exam'
]) {
	const { data } = await call('POST', '/api/onboarding/suggest', { sentence });
	console.log(`"${sentence}" → ${data.templates.map((t) => t.label).join(', ')} (by ${data.by})`);
}

console.log('\n===== YOUR RHYTHM =====');
const before = (await call('GET', '/api/settings/rhythm')).data;
console.log(`Now: ${before.summary}`);
const crafts = await call('PUT', '/api/settings/rhythm', { templates: ['crafts'] });
console.log(`Crafts template: ${crafts.data.summary}`);
await call('PUT', '/api/settings/rhythm', {
	templates: before.templates.map((t) => t.id),
	rhythm: before.rhythm,
	reviews: before.reviews
});
console.log(`Put back: ${(await call('GET', '/api/settings/rhythm')).data.rhythmText}`);

console.log('\n===== REST MODE =====');
const until = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const resting = await call('PUT', '/api/pet/rest', { until });
console.log(`On until ${until}: ${resting.data.pet?.mood} — ${resting.data.pet?.why}`);
const awake = await call('PUT', '/api/pet/rest', { until: null });
console.log(`Off: ${awake.data.pet?.mood}`);

console.log('\n===== EXPERIMENTS =====');
console.log(JSON.stringify((await call('GET', '/api/experiments')).data.variants));
const { data: results } = await call('GET', '/api/dev/experiments');
for (const e of results.experiments) {
	console.log(
		`${e.id}: ${e.variants.map((v) => `${v.variant} ${v.users} users, ${v.first_step_done ?? 0} first step`).join(' | ')}`
	);
}
