// Voice ("just yap") live check (npm run dev running):
//   node.exe scripts/check-voice.mjs                 speaks a sample ramble with Windows' voice
//   node.exe scripts/check-voice.mjs my-ramble.m4a   or your own recording (wav, mp3, m4a, ogg, flac, webm)
// The sample is written to scripts/fixtures/ (git-ignored).
// Cost: voice 2 credits + 1 AI call; approving one idea captures it (analysis: 2 credits, 1 AI call)
// and shows fit-it-in offers (free). Walrus: 1 `analyze` for the voice memory, 1 for the new goal.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
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

const RAMBLE =
	'Okay so, um, I want to try making a lo-fi beat this weekend. Also for the jazz piano thing I should practise the two five one in F major. ' +
	'And I keep thinking about learning Japanese before my trip next spring. Oh, and note to self, the drop two voicings finally clicked today when I played them really slowly.';

const MIME = {
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.m4a': 'audio/mp4',
	'.aac': 'audio/aac',
	'.ogg': 'audio/ogg',
	'.flac': 'audio/flac',
	'.webm': 'audio/webm'
};
let path = process.argv[2];
if (!path) {
	mkdirSync('scripts/fixtures', { recursive: true });
	path = 'scripts/fixtures/voice-sample.wav';
	if (!existsSync(path)) {
		console.log('Speaking the sample ramble into scripts/fixtures/voice-sample.wav …');
		const script = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SetOutputToWaveFile('${path}'); $s.Speak('${RAMBLE.replace(/'/g, "''")}'); $s.Dispose()`;
		execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { stdio: 'inherit' });
	}
}
const mime = MIME[extname(path).toLowerCase()];
if (!mime) throw new Error(`Unsupported audio: ${path}`);

console.log(`===== HEAR THE RAMBLE (${path}) =====`);
const heard = await call('POST', '/api/voice', {
	audio: readFileSync(path).toString('base64'),
	mime
});
console.log(`Transcript: ${heard.transcript}\n`);
if (heard.status !== 'split') throw new Error('No ideas were found in it.');
heard.ideas.forEach((i, n) =>
	console.log(`  ${n + 1}. [${i.kind}${i.forItem ? ` → ${i.forItem}` : ''}] ${i.title}: ${i.text}`)
);

console.log('\n===== APPROVE ONE IDEA → FIT IT IN =====');
const idea = heard.ideas.find((i) => i.kind === 'step') ?? heard.ideas[0];
const { item } = await call('POST', '/api/items', {
	captureType: 'note',
	note: idea.text,
	title: idea.title
});
console.log(`Captured "${idea.title}"`);
const fit = await call('POST', '/api/plan/fit', { itemId: item.id });
console.log(
	`  Related: ${fit.related ? `${fit.related.title} (${fit.related.score})` : 'none close enough'}`
);
for (const o of fit.offers) console.log(`  [${o.choice}] ${o.label}`);
console.log('  (offers shown only; nothing applied)');

const { memories } = await call('GET', '/api/memories');
console.log(
	`\nMemory: ${memories.find((m) => m.type === 'voice_ideas')?.summary ?? '(not found)'}`
);
