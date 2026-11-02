// Memory receipts live check (npm run dev running): node.exe scripts/check-receipts.mjs
// Reads the Walrus Memory account on Sui mainnet through Tatum's gRPC gateway, twice: the second
// read comes from the 10-minute cache.
// Cost: 0 credits, 0 AI calls, 0 Walrus writes. Tatum: 2 Sui gRPC calls (the first read only).
const BASE = 'http://localhost:5173';

async function get(path) {
	const res = await fetch(BASE + path);
	const data = await res.json().catch(() => null);
	if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${JSON.stringify(data)}`);
	return data;
}

const t0 = Date.now();
const first = await get('/api/memories/receipts');
const ms = Date.now() - t0;
const { account, yours } = first;

console.log('===== MEMORY RECEIPT (Sui mainnet, read through Tatum) =====');
console.log(`Account:      ${account.id}`);
console.log(`Type:         ${account.type}`);
console.log(`Owner:        ${account.owner}`);
console.log(`Version:      ${account.version}  (a shared object: jumps with network activity)`);
if (account.lastChange) {
	console.log(`Last change:  ${account.lastChange.at ?? 'time unknown'}`);
	console.log(`              ${account.lastChange.explorerUrl}`);
}
console.log(`View on Sui:  ${account.explorerUrl}`);
console.log(
	`\nYours: ${yours.sentToWalrus} memories sent to Walrus, in namespace ${yours.namespace}`
);
if (yours.latest) {
	console.log(`Latest memory: ${yours.latest.summary.slice(0, 90)}`);
	console.log(`  stored as Walrus blob ${yours.latest.blobId}`);
	console.log(`  ${yours.latest.walruscanUrl}`);
}
console.log(`(read in ${ms} ms, cached: ${first.cached})`);

const t1 = Date.now();
const second = await get('/api/memories/receipts');
console.log(`Second read: ${Date.now() - t1} ms, cached: ${second.cached} (no Tatum calls)`);
