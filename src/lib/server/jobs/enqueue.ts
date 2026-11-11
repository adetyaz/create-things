import { dev } from '$app/environment';
import { QUEUES, type QueueKey } from './queues';
import { HANDLERS, type JobBodies } from './registry';
import { optionalEnv } from '$lib/server/platform/env';

export type EnqueueResult = 'queued' | 'running inline (dev)' | 'running after the response';

/** Under `vite dev`: the tail of each queue's inline jobs, so they run in order. */
const inline: Partial<Record<QueueKey, Promise<void>>> = {};

/**
 * Sends a job to its queue. `vite dev` has no queue consumer, so there the job runs in the
 * background of the dev server instead (one at a time per queue), and its outcome is logged.
 */
export async function enqueue<K extends QueueKey>(
	platform: App.Platform | undefined,
	key: K,
	body: JobBodies[K]
): Promise<EnqueueResult> {
	// LOCAL_DEV=true: a local build (npm run preview) has no queue consumer either.
	if (dev || optionalEnv('LOCAL_DEV') === 'true') {
		// One at a time per queue, like production's consumers (memory: concurrency 1), so a burst
		// of jobs (re-sending memories after a delete) doesn't trip rate limits.
		const run = () =>
			HANDLERS[key](platform, body)
				.then((outcome) => console.log(`[${key}]`, JSON.stringify(outcome)))
				.catch((e) => console.error(`[${key}] failed:`, e));
		inline[key] = (inline[key] ?? Promise.resolve()).then(run);
		return 'running inline (dev)';
	}

	const producer = platform?.env?.[QUEUES[key].binding];
	if (!producer) {
		// No queue (Vercel): run the job once the response has gone out, one at a time per queue.
		const run = () =>
			HANDLERS[key](platform, body)
				.then((outcome) => console.log(`[${key}]`, JSON.stringify(outcome)))
				.catch((e) => console.error(`[${key}] failed:`, e));
		const job = (inline[key] ?? Promise.resolve()).then(run);
		inline[key] = job;
		const { waitUntil } = await import('@vercel/functions');
		waitUntil(job);
		return 'running after the response';
	}
	await producer.send(body);
	return 'queued';
}
