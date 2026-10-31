// Planning live check (npm run dev must be running, migration 0005 applied): node.exe scripts/check-plan.mjs
// Month: picks your Focus item(s) as goals. Week: proposes 4 blocks over the next days and saves them.
// Day: ranks tomorrow's top 3 and shows today and tomorrow.
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

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const showDay = (view) => {
	console.log(`${view.day}: ${view.blocks.length} blocks`);
	for (const b of view.blocks)
		console.log(`  #${b.position} ${b.intention}${b.step.done ? ' (done)' : ''}`);
	console.log(`  Today would show: ${view.first ? view.first.step.title : 'nothing'}`);
};

console.log('===== MONTH =====');
const focus = await call('GET', '/api/focus');
const focusItems = Array.isArray(focus) ? focus : (focus.items ?? focus.focus ?? []);
if (focusItems.length === 0)
	throw new Error('Nothing in Focus. Start an item first (POST /api/focus/decide).');
const planned = await call('POST', '/api/plan/month', {
	goalItemIds: focusItems.slice(0, 3).map((i) => i.id),
	review: 'Got the roadmap feature working; kept getting pulled into side ideas.'
});
console.log(
	`${planned.month.name}: goals = ${planned.month.goals.map((g) => g.title).join(' | ')}`
);
console.log(
	`Parked until next month: ${planned.parked} (not-this-month list has ${planned.month.notThisMonth.length})`
);

console.log('\n===== WEEK (proposal) =====');
const blocks = [
	{ day: day(1), startTime: '08:00', place: 'my desk' },
	{ day: day(1), anchor: 'after lunch' },
	{ day: day(2), startTime: '19:30' },
	{ day: day(3), anchor: 'after coffee', place: 'the cafe' }
];
let proposal = await call('POST', '/api/plan/week', { blocks });

// Goals started before roadmaps existed have none: ask for them and wait (up to 3 min).
if (proposal.needsRoadmap.length) {
	console.log(`Making roadmaps for: ${proposal.needsRoadmap.map((g) => g.title).join(', ')}`);
	for (const goal of proposal.needsRoadmap) await call('POST', `/api/items/${goal.id}/roadmap`);
	for (let i = 0; i < 36 && proposal.needsRoadmap.length; i++) {
		await new Promise((r) => setTimeout(r, 5000));
		proposal = await call('POST', '/api/plan/week', { blocks });
	}
	for (const goal of proposal.needsRoadmap) console.log(`  Still no roadmap for ${goal.title}`);
	const first = proposal.blocks.find((b) => b.step);
	if (first) {
		const { roadmap } = await call('GET', `/api/items/${first.step.itemId}/roadmap`);
		console.log('Roadmap (learning goals should have recall questions):');
		for (const m of roadmap.milestones) {
			console.log(`  ${m.title}`);
			for (const s of m.steps)
				console.log(`    - ${s.title}${s.recall ? `\n        recall: ${s.recall}` : ''}`);
		}
	}
}
for (const b of proposal.blocks)
	console.log(`  ${b.intention ?? `${b.day}: (empty, no steps left)`}`);
if (proposal.needsRoadmap.length)
	console.log(`  Goals without a roadmap: ${proposal.needsRoadmap.map((g) => g.title).join(', ')}`);

const filled = proposal.blocks.filter((b) => b.step);
if (filled.length === 0)
	throw new Error('No steps to plan: the goals need roadmaps with unfinished steps.');
const saved = await call('PUT', '/api/plan/week', {
	blocks: filled.map(({ day, startTime, anchor, place, step }) => ({
		day,
		startTime,
		anchor,
		place,
		stepId: step.id
	}))
});
console.log(`Saved: week of ${saved.weekOf}, ${saved.blocks} blocks`);

console.log('\n===== DAY =====');
const tomorrow = await call('GET', `/api/plan/day?date=${day(1)}`);
const reversed = tomorrow.blocks
	.map((b) => b.step.id)
	.reverse()
	.slice(0, 3);
const ranked = await call('POST', '/api/plan/tomorrow', { stepIds: reversed });
console.log('Tomorrow, re-ranked in reverse (Ivy Lee):');
showDay(ranked.tomorrow);
console.log('\nToday:');
showDay(await call('GET', '/api/plan/day'));

console.log('\n===== PLAN MEMORIES =====');
const { memories } = await call('GET', '/api/memories');
for (const m of memories.slice(0, 4)) console.log(`${m.type} [${m.status}]: ${m.summary}`);
