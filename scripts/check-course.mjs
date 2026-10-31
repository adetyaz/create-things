// Follow-a-course live check (npm run dev running, migration 0010 applied):
//   node.exe scripts/check-course.mjs                      (built-in sample syllabus)
//   node.exe scripts/check-course.mjs syllabus.pdf         (your own PDF)
//   node.exe scripts/check-course.mjs page1.png page2.png  (photos or screenshots, in order)
// Reads the syllabus, starts the course (pausing your Focus item, restored at the end), confirms it,
// shows the roadmap against the units, and proposes a week marking blocks before each class.
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

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
const day = (offset) => new Date(Date.now() + offset * 86400000);
const iso = (offset) => day(offset).toISOString().slice(0, 10);
const spoken = (offset) =>
	day(offset).toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

const MIME = {
	'.pdf': 'application/pdf',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.txt': 'text/plain'
};
const paths = process.argv.slice(2);
const files = paths.length
	? paths.map((p) => {
			const mime = MIME[extname(p).toLowerCase()];
			if (!mime) throw new Error(`Unsupported file: ${p} (use PDF, PNG, JPG, WEBP)`);
			return { mime, data: readFileSync(p).toString('base64') };
		})
	: [
			{
				mime: 'text/plain',
				data: Buffer.from(
					[
						'Beginner Guitar: 5-week evening course, Riverside Community Arts Centre',
						`Week 1 (${spoken(1)}): Holding the guitar, tuning, open E minor and A minor chords`,
						`Week 2 (${spoken(3)}): Open G, C and D chords; changing between two chords`,
						`Week 3 (${spoken(5)}): Down-up strumming patterns and keeping time with a metronome`,
						`Week 4 (${spoken(8)}): Your first full song with four chords`,
						`Week 5 (${spoken(10)}): Barre chord basics (F major)`,
						`Final showcase: ${spoken(14)}, play one song for the group`
					].join('\n')
				).toString('base64')
			}
		];

console.log(
	`===== READ THE SYLLABUS (${paths.length ? paths.join(', ') : 'built-in sample'}) =====`
);
const { item, units } = await call('POST', '/api/courses', { files });
console.log(
	`${item.title}  [intent: ${item.intent}, practice: ${item.practiceKind ?? '-'}, target: ${item.targetDate ?? '-'}]`
);
console.log(`Goal: ${item.goal ?? '-'}`);
units.forEach((u, i) => console.log(`  ${i + 1}. ${u.title}${u.date ? `  (${u.date})` : ''}`));

console.log('\n===== START + CONFIRM =====');
const { focus } = await call('GET', '/api/focus');
for (const f of focus) await call('POST', '/api/focus/pause', { itemId: f.id });
const started = await call('POST', '/api/focus/decide', { itemId: item.id, decision: 'start' });
console.log(`  card: ${started.confirm?.message ?? '(already confirmed)'}`);
const confirmed = await call('PUT', `/api/items/${item.id}/understanding`, {});
console.log(`  planning: ${confirmed.planning}`);

let roadmap = null;
for (let i = 0; i < 36 && !roadmap; i++) {
	await wait(5000);
	const res = await call('GET', `/api/items/${item.id}/roadmap`);
	if (res.planError) throw new Error(`Planning failed: ${res.planError}`);
	roadmap = res.roadmap;
}
if (!roadmap) throw new Error('No roadmap appeared.');
console.log(`\n===== ROADMAP (goal: ${roadmap.roadmap.goal}) =====`);
roadmap.milestones.forEach((m, i) => {
	const match =
		units[i]?.title === m.title ? '✓' : `✗ expected "${units[i]?.title ?? '(no unit)'}"`;
	console.log(`  ${m.title}  ${match}`);
	for (const s of m.steps) console.log(`    ${s.kind === 'proof' ? '★' : '-'} ${s.title}`);
});

console.log('\n===== A WEEK AROUND THE CLASSES =====');
const month = await call('GET', '/api/plan/month');
if (month.planned) {
	// With a month planned, the week draws from its goals; this check uses only the new course.
	await call('POST', '/api/plan/month', { goalItemIds: [item.id] });
	console.log(`  (set ${month.name}'s goal to just this course for the check)`);
}
const week = await call('POST', '/api/plan/week', {
	blocks: [
		{ day: iso(1), startTime: '18:00' },
		{ day: iso(2), startTime: '18:00' },
		{ day: iso(3), anchor: 'after dinner' },
		{ day: iso(4), startTime: '18:00' }
	]
});
for (const c of week.classes) console.log(`  CLASS ${c.date}: ${c.unit}`);
for (const b of week.blocks) {
	console.log(
		`  ${b.intention ?? `${b.day}: (empty)`}${b.beforeClass ? `  ← before the ${b.beforeClass.date} class` : ''}`
	);
}
console.log('  (proposal only, not saved)');

await call('POST', '/api/focus/pause', { itemId: item.id });
for (const f of focus) await call('POST', '/api/focus/decide', { itemId: f.id, decision: 'start' });
console.log(`\nRestored Focus: ${focus.map((f) => f.title).join(', ') || 'nothing'}`);
