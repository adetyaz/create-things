// Journal and check-ins (npm run dev running, migration 0015 applied):
//   node.exe scripts/check-journal.mjs
// Writes a check-in about your first Focus item (by its step's words, so the free rules match it),
// a longer entry (a meal), a note about the day (no food), shows what fed the pet, then drafts
// flashcards from the learning entry and saves one (a snack).
// Cost: 1 credit + 1 AI call (the flashcard draft). The "about" check is free and only runs when
// the rules can't tell. Walrus: one "Checked in on …" line in the daily digest (no extra call).
// These entries stay in your journal (no delete yet); the pet eats within its daily limit.
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}
const show = (label, r) =>
	console.log(
		`${label}: ${r.status} about=${r.data?.about?.title ?? 'nothing'} fed=${r.data?.fed?.status ?? 'no'}${r.data?.fed?.size ? ` (${r.data.fed.size})` : ''} offerCards=${r.data?.offerCards}`
	);

const { data: focus } = await call('GET', '/api/focus');
const item = focus.focus?.[0];
if (!item) throw new Error('Start something first: nothing is in Focus');
const { data: rm } = await call('GET', `/api/items/${item.id}/roadmap`);
const step = rm?.roadmap?.currentStep?.title ?? item.title;
console.log(`Focus: ${item.title}\nCurrent step: ${step}\n`);

show(
	'Check-in (rules match the step)',
	await call('POST', '/api/journal', { kind: 'check_in', body: `Did 10 minutes: ${step}` })
);
const long = await call('POST', '/api/journal', {
	kind: 'entry',
	itemId: item.id,
	body: `Worked on ${step}. I learned that going slowly at first makes the later steps faster, and that the hardest part is starting. Next time I want to try it for a little longer and write down what changed, so I can see the difference between sessions and keep what works for me.`
});
show('Long entry (a meal)', long);
show(
	'About the day (no food)',
	await call('POST', '/api/journal', {
		kind: 'entry',
		aboutDay: true,
		body: 'Busy day, went to the market.'
	})
);

console.log('\n===== FLASHCARDS FROM THE LONG ENTRY (1 credit) =====');
const drafts = await call('GET', `/api/journal/${long.data.entry.id}/cards`);
console.log(
	`${drafts.status}`,
	JSON.stringify(drafts.data?.cards ?? drafts.data?.message, null, 1)
);
if (drafts.data?.cards?.length) {
	const saved = await call('POST', `/api/journal/${long.data.entry.id}/cards`, {
		cards: drafts.data.cards.slice(0, 1)
	});
	console.log(`Saved 1: ${saved.status} fed=${saved.data?.fed?.status}`);
}

const { data: pet } = await call('GET', '/api/pet');
if (pet.pet) {
	console.log(
		`\n${pet.pet.pet.name}: ${pet.pet.mood}. ${pet.pet.why} Today ${pet.pet.today.eaten}/${pet.pet.today.limit}`
	);
	console.log(
		pet.pet.history
			.slice(0, 4)
			.map((h) => `  ${h.size} · ${h.label}`)
			.join('\n')
	);
}
