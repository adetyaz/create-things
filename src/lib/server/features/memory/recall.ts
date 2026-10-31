import { memoryClient } from '$lib/server/integrations/walrus/client';
import { namespaceFor } from './namespace';

export interface RecalledMemory {
	text: string;
	/** Lower is closer to the query. */
	distance: number;
	createdAt: string | null;
}

/**
 * The user's memories most relevant to `query`, from Walrus. Returns [] if recall fails, so callers
 * (Pick for me, roadmaps, chat) keep working without memory rather than breaking.
 */
export async function recallMemories(
	userId: string,
	query: string,
	limit = 5
): Promise<RecalledMemory[]> {
	try {
		const { results } = await memoryClient(namespaceFor(userId)).recall({ query, limit });
		return results.map((r) => ({
			text: r.text,
			distance: r.distance,
			createdAt: r.created_at ?? null
		}));
	} catch (e) {
		console.error('[memory] recall failed', e);
		return [];
	}
}
