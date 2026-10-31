import type { Bindings } from '$lib/server/platform/bindings';

/** Every queue: its Cloudflare name (wrangler.jsonc) and producer binding. Add new queues here. */
export const QUEUES = {
	analysis: { name: 'createthings-analysis', binding: 'ANALYSIS_QUEUE' },
	memory: { name: 'createthings-memory', binding: 'MEMORY_QUEUE' },
	roadmap: { name: 'createthings-roadmap', binding: 'ROADMAP_QUEUE' }
} as const satisfies Record<string, { name: string; binding: keyof Bindings }>;

export type QueueKey = keyof typeof QUEUES;

export function queueKeyForName(name: string): QueueKey | undefined {
	return (Object.keys(QUEUES) as QueueKey[]).find((key) => QUEUES[key].name === name);
}
