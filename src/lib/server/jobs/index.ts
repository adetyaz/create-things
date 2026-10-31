/** Background jobs over Cloudflare Queues. Features call `enqueue`; the worker calls `handleQueueMessage`. */
import { HANDLERS } from './registry';
import { queueKeyForName } from './queues';

export { enqueue, type EnqueueResult } from './enqueue';
export { QUEUES, type QueueKey } from './queues';

/** Runs one queue message. Returns null when no handler exists for the queue. */
export async function handleQueueMessage(
	platform: App.Platform | undefined,
	queueName: string,
	body: unknown
): Promise<unknown | null> {
	const key = queueKeyForName(queueName);
	if (!key) return null;
	return HANDLERS[key](platform, body as never);
}
