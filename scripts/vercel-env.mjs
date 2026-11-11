// Copies the server settings from .env into your Vercel project's Production environment.
// Needs the Vercel CLI, logged in and linked first:
//   npx vercel login && npx vercel link
//   node.exe scripts/vercel-env.mjs https://<your-app>.vercel.app
// Never prints a value. Cost: nothing.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const appUrl = process.argv[2];
if (!appUrl?.startsWith('https://')) {
	console.error('Pass the production URL, e.g. node.exe scripts/vercel-env.mjs https://createthings.vercel.app');
	process.exit(1);
}
const env = Object.fromEntries(
	readFileSync('.env', 'utf8')
		.split(/\r?\n/)
		.filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l))
		.map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^(["'])(.*)\1$/, '$2')])
);
// Local-only settings stay behind; the app's own URL is the production one.
const SKIP = new Set(['SKIP_ANALYSIS', 'DEV_USER_ID', 'DATABASE_URL_UNPOOLED']);
env.PUBLIC_APP_URL = appUrl;

for (const [name, value] of Object.entries(env)) {
	if (SKIP.has(name) || !value) continue;
	try {
		execSync(`npx vercel env rm ${name} production --yes`, { stdio: 'ignore' });
	} catch {
		// not set yet
	}
	execSync(`npx vercel env add ${name} production`, { input: value, stdio: ['pipe', 'ignore', 'inherit'] });
	console.log(`set ${name}`);
}
console.log('Done. Redeploy for the new values to apply: npx vercel --prod');
