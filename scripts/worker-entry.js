// createthings worker entry (copied into .svelte-kit/cloudflare/_worker.js by scripts/wrap-worker.mjs).
// SvelteKit's adapter only builds a fetch() worker, so this adds queue() around it.
import sveltekit from './_sveltekit_worker.js';

/** Read by src/routes/api/internal/queue/[queue]/+server.ts. Outside requests can't set it. */
const FROM_QUEUE = '__FROM_QUEUE';

export default {
	fetch(request, env, ctx) {
		return sveltekit.fetch(request, env, ctx);
	},

	/** Hands each message to the app's internal queue route, in-process. */
	async queue(batch, env, ctx) {
		const queueEnv = { ...env, [FROM_QUEUE]: true };
		const url = `https://queue.internal/api/internal/queue/${encodeURIComponent(batch.queue)}`;

		for (const message of batch.messages) {
			try {
				const res = await sveltekit.fetch(
					new Request(url, {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify(message.body)
					}),
					queueEnv,
					ctx
				);
				if (res.ok) {
					console.log(`[queue ${batch.queue}]`, await res.text());
					message.ack();
				} else {
					console.error(`[queue ${batch.queue}] HTTP ${res.status}:`, await res.text());
					message.retry({ delaySeconds: 30 * message.attempts });
				}
			} catch (e) {
				console.error(`[queue ${batch.queue}] failed:`, e);
				message.retry({ delaySeconds: 30 * message.attempts });
			}
		}
	}
};
