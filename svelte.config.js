import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// `npm run dev` emulates bindings from the `local` environment (no Workers AI, no remote session).
		adapter: adapter({ platformProxy: { environment: 'local' } })
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
