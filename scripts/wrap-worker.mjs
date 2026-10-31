// After `vite build`: move SvelteKit's worker aside and put scripts/worker-entry.js in its place,
// so the deployed worker handles queue messages as well as requests. Wrangler's `main` stays the same.
import { copyFileSync, existsSync, readFileSync, renameSync } from 'node:fs';

const dir = '.svelte-kit/cloudflare';
const worker = `${dir}/_worker.js`;
const inner = `${dir}/_sveltekit_worker.js`;
const marker = 'createthings worker entry';

if (!existsSync(worker)) {
	console.error(`${worker} not found. Run vite build first.`);
	process.exit(1);
}
if (readFileSync(worker, 'utf8').includes(marker)) {
	console.log('Worker already wrapped');
	process.exit(0);
}

renameSync(worker, inner);
copyFileSync('scripts/worker-entry.js', worker);
console.log('Wrapped the SvelteKit worker with queue handling');
