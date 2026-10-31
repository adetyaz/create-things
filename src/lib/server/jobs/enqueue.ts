import { dev } from '$app/environment';
import { QUEUES, type QueueKey } from './queues';
import { HANDLERS, type JobBodies } from './registry';

export type EnqueueResult = 'queued' | 'running inline (dev)';

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
	if (dev) {
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
	if (!producer) throw new Error(`${QUEUES[key].binding} binding is missing`);
	await producer.send(body);
	return 'queued';
}
