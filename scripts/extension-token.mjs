// Makes a connection token for the browser extension (until sign-in exists). npm run dev running:
//   node.exe scripts/extension-token.mjs "Chrome on my laptop"
// Paste the printed token into the extension's Connect screen. It's shown once; only its hash is
// stored. Cost: nothing.
const BASE = process.env.APP_URL ?? 'http://localhost:5173';
const res = await fetch(`${BASE}/api/extension/token`, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ label: process.argv[2] ?? 'Browser extension' })
});
const data = await res.json();
if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data)}`);
console.log(`Connection token for "${data.label}" (shown once):\n\n  ${data.token}\n`);
console.log(`App address for the extension: ${BASE}`);
