import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

// `vite dev` emulates the Workers bindings; point the emulated Hyperdrive at Neon from .env.
const fileEnv = loadEnv('development', process.cwd(), '');
process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??=
	fileEnv.DATABASE_URL_UNPOOLED || fileEnv.DATABASE_URL;

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// Its main entry has an extensionless import that Node's loader rejects; bundling resolves it.
	ssr: { noExternal: ['@material/material-color-utilities'] },
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					// Its main entry has an extensionless import Node's loader rejects; Vite resolves it.
					server: { deps: { inline: ['@material/material-color-utilities'] } },
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
