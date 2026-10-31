import { dev } from '$app/environment';
import { QUEUES, type QueueKey } from './queues';
import { HANDLERS, type JobBodies } from './registry';

export type EnqueueResult = 'queued' | 'running inline (dev)';

/**
 * Sends a job to its queue. `vite dev` has no queue consumer, so there the job runs in the
 * background of the dev server instead, and its outcome is logged.
 */
export async function enqueue<K extends QueueKey>(
	platform: App.Platform | undefined,
	key: K,
	body: JobBodies[K]
): Promise<EnqueueResult> {
	if (dev) {
		HANDLERS[key](platform, body)
			.then((outcome) => console.log(`[${key}]`, JSON.stringify(outcome)))
			.catch((e) => console.error(`[${key}] failed:`, e));
		return 'running inline (dev)';
	}

	const producer = platform?.env?.[QUEUES[key].binding];
	if (!producer) throw new Error(`${QUEUES[key].binding} binding is missing`);
	await producer.send(body);
	return 'queued';
}
