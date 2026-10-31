// Year / half-year / quarter live check (npm run dev running, migration 0011 applied):
//   node.exe scripts/check-horizons.mjs
// Plans the year (themes, who you want to become, goals), then the half and quarter, each from the
// one above, and shows the quarter goals' target date and the month's suggestions.
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
const titles = (list) => list.map((g) => g.title).join(' | ') || '(none)';

const { items } = await call('GET', '/api/items');
const jazz = items.find((i) => /jazz piano chords/i.test(i.title) && i.status !== 'archived');
const portfolio = items.find((i) => /portfolio site/i.test(i.title));
if (!jazz || !portfolio)
	throw new Error('Needs the jazz and portfolio items from check-intents.mjs.');

console.log('===== YEAR =====');
const before = await call('GET', '/api/plan/periods/year');
console.log(`${before.name} (${before.startsOn} → ${before.endsOn}), planned: ${before.planned}`);
console.log(`Review of ${before.review.of}: ${before.review.questions.join(' / ')}`);
const year = await call('POST', '/api/plan/periods/year', {
	themes: ['Play jazz piano', 'Ship my portfolio'],
	intention: 'Someone who makes things every week',
	goalItemIds: [jazz.id, portfolio.id],
	review: 'Started lots of things, finished few; this year I keep it to two.'
});
console.log(`Themes: ${year.horizon.themes.join('; ')} | Becoming: ${year.horizon.intention}`);
console.log(`Goals: ${titles(year.horizon.goals)}`);

console.log('\n===== HALF-YEAR (shortlist comes from the year) =====');
const half = await call('GET', '/api/plan/periods/half');
console.log(`${half.name}: shortlist = ${titles(half.shortlist)}`);
await call('POST', '/api/plan/periods/half', { goalItemIds: [jazz.id, portfolio.id] });

console.log('\n===== QUARTER (shortlist comes from the half) =====');
const quarterBefore = await call('GET', '/api/plan/periods/quarter');
console.log(`${quarterBefore.name}: shortlist = ${titles(quarterBefore.shortlist)}`);
const quarter = await call('POST', '/api/plan/periods/quarter', { goalItemIds: [jazz.id] });
for (const g of quarter.horizon.goals)
	console.log(`  ${g.title} → due ${g.targetDate} (quarter ends ${quarter.horizon.endsOn})`);

console.log('\n===== MONTH (suggested from the quarter) =====');
const month = await call('GET', '/api/plan/month');
console.log(`${month.name}: suggested = ${titles(month.suggested)}`);

console.log('\n===== RULES =====');
const tooMany = await fetch(`${BASE}/api/plan/periods/quarter`, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ themes: ['Not for quarters'] })
});
console.log(`Themes on a quarter → ${tooMany.status} ${(await tooMany.json()).message}`);
const monthRoute = await fetch(`${BASE}/api/plan/periods/month`);
console.log(`/api/plan/periods/month → ${monthRoute.status} (month has its own route)`);

const { memories } = await call('GET', '/api/memories');
console.log('\n===== MEMORIES =====');
for (const m of memories.slice(0, 4)) console.log(`${m.type}: ${m.summary}`);
