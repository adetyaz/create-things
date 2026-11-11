import cloudflare from '@sveltejs/adapter-cloudflare';
import vercel from '@sveltejs/adapter-vercel';

/**
 * Two ways to host the same app:
 * - Vercel (the build sets VERCEL=1): a Node function; jobs run after the response
 *   (waitUntil), the scheduled jobs come from vercel.json crons.
 * - Cloudflare Workers (`wrangler deploy`): queues, Workers AI, Hyperdrive, crons.
 */
const onVercel = !!process.env.VERCEL;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: onVercel
			? vercel({ runtime: 'nodejs22.x', maxDuration: 60 })
			: // `npm run dev` emulates bindings from the `local` environment (no Workers AI, no remote session).
				cloudflare({ platformProxy: { environment: 'local' } })
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
