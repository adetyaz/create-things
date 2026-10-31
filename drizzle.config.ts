import { defineConfig } from 'drizzle-kit';
import { loadEnv } from 'vite';

// Migrations run over a direct connection; Neon's pooler is for app traffic.
const env = loadEnv('development', process.cwd(), '');
const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/server/db/schema/index.ts',
	out: './drizzle',
	dbCredentials: { url: url ?? '' },
	strict: true,
	verbose: true
});
