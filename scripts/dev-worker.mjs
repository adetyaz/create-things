// Runs the built app in the local Workers runtime with secrets from .env.
// Usage: npm run dev:worker   (builds first; extra args go to `wrangler dev`)
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

if (!existsSync('.env')) {
	console.error('.env not found');
	process.exit(1);
}

const dotenv = Object.fromEntries(
	readFileSync('.env', 'utf8')
		.split(/\r?\n/)
		.map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
		.filter(Boolean)
		.map(([, key, value]) => [key, value.replace(/^(['"])(.*)\1$/, '$2')])
);

// Hyperdrive talks to Postgres directly, so give it the unpooled Neon URL.
const local = dotenv.DATABASE_URL_UNPOOLED || dotenv.DATABASE_URL;
if (!local) {
	console.error('DATABASE_URL_UNPOOLED or DATABASE_URL must be set in .env');
	process.exit(1);
}

// `--env local`: no Workers AI binding, so nothing reaches Cloudflare (see wrangler.jsonc).
const args = ['wrangler', 'dev', '--env', 'local', '--env-file', '.env', ...process.argv.slice(2)];
const child = spawn('npx', args, {
	stdio: 'inherit',
	shell: true,
	env: { ...process.env, CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: local }
});
child.on('exit', (code) => process.exit(code ?? 0));
