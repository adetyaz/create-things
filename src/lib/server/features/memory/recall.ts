import { memoryClient } from '$lib/server/integrations/walrus/client';
import { currentNamespace } from './namespace';
import { deletedBlobIds } from './service';

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
	platform: App.Platform | undefined,
	userId: string,
	query: string,
	limit = 5
): Promise<RecalledMemory[]> {
	try {
		const [namespace, deleted] = await Promise.all([
			currentNamespace(platform, userId),
			deletedBlobIds(platform, userId)
		]);
		// Walrus can't erase, so deleted memories' facts are left out here (Breakdown §13).
		const { results } = await memoryClient(namespace).recall({
			query,
			limit: limit + Math.min(deleted.size, 20),
			// Cost rule 6: only close matches, so prompts stay short (the SDK's suggested start).
			maxDistance: 0.8
		});
		return results
			.filter((r) => !deleted.has(r.blob_id))
			.slice(0, limit)
			.map((r) => ({
				text: r.text,
				distance: r.distance,
				createdAt: r.created_at ?? null
			}));
	} catch (e) {
		console.error('[memory] recall failed', e);
		return [];
	}
}
