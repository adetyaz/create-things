// Extension server-side check (npm run dev running, migration 0014 applied):
//   node.exe scripts/check-extension.mjs
// Makes a connection token, then as the extension would: saves a page as a reference, saves a
// screenshot of your screen (taken with Windows' screen capture into scripts/fixtures/), checks a bad
// token is refused, and revokes the token.
// Cost: 4 credits, 2 AI calls (two analyses). Walrus: 1 `analyze` (the screenshot's goal; references
// don't make goal memories).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, path, body, token) {
	const res = await fetch(BASE + path, {
		method,
		headers: {
			...(body ? { 'content-type': 'application/json' } : {}),
			...(token ? { authorization: `Bearer ${token}` } : {})
		},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}
async function analysed(id, token) {
	for (let i = 0; i < 40; i++) {
		const { data } = await call('GET', `/api/items/${id}`, null, token);
		if (data.analysis || data.item.analysisError) return data;
		await wait(3000);
	}
	throw new Error('Analysis did not finish');
}

console.log('===== CONNECT =====');
const made = await call('POST', '/api/extension/token', { label: 'check-extension' });
const token = made.data.token;
console.log(`Token made: ${token.slice(0, 7)}… (shown once)`);
const devices = await call('GET', '/api/extension/token', null, token);
console.log(
	`Connected with it: ${devices.status === 200} (${devices.data.devices.length} device(s))`
);

console.log('\n===== SAVE A PAGE AS A REFERENCE =====');
const ref = await call(
	'POST',
	'/api/items',
	{
		captureType: 'url',
		sourceUrl: 'https://www.are.na/',
		note: 'Love this layout',
		asReference: true
	},
	token
);
console.log(`Saved with status: ${ref.data.item.status}`);
const refDone = await analysed(ref.data.item.id, token);
console.log(
	`After analysis: status ${refDone.item.status} (stays a reference), summary: ${refDone.analysis?.summary ?? refDone.item.analysisError}`
);

console.log('\n===== SAVE A SCREENSHOT =====');
mkdirSync('scripts/fixtures', { recursive: true });
const png = 'scripts/fixtures/screen.png';
execFileSync('powershell.exe', [
	'-NoProfile',
	'-Command',
	`Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp=New-Object System.Drawing.Bitmap 1280,720; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,(New-Object System.Drawing.Size 1280,720)); $bmp.Save('${png}'); $g.Dispose(); $bmp.Dispose()`
]);
const shot = await call(
	'POST',
	'/api/items',
	{
		captureType: 'screenshot',
		image: readFileSync(png).toString('base64'),
		mime: 'image/png',
		title: 'Screen check'
	},
	token
);
console.log(`Saved with status: ${shot.data.item.status}`);
const shotDone = await analysed(shot.data.item.id, token);
console.log(
	`After analysis: status ${shotDone.item.status}, summary: ${shotDone.analysis?.summary ?? shotDone.item.analysisError}`
);

console.log('\n===== BAD AND REVOKED TOKENS =====');
const bad = await call('GET', '/api/items', null, 'ct_not_a_real_token');
console.log(`Unknown token → ${bad.status} ${bad.data?.message}`);
await call('DELETE', `/api/extension/token/${made.data.id}`, null, token);
const revoked = await call('GET', '/api/items', null, token);
console.log(`After revoking → ${revoked.status} ${revoked.data?.message}`);
