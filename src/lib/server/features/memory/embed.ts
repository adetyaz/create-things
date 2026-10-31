import { memoryClient } from '$lib/server/integrations/walrus/client';
import { namespaceFor } from './namespace';

/**
 * Embedding vectors from Walrus `embed` (nothing is stored), for matching things by meaning.
 * Returns null if embedding fails, so callers fall back to letting the user choose.
 */
export async function embedTexts(userId: string, texts: string[]): Promise<number[][] | null> {
	try {
		const client = memoryClient(namespaceFor(userId));
		const results = await Promise.all(texts.map((text) => client.embed(text.slice(0, 2000))));
		return results.map((r) => r.vector);
	} catch (e) {
		console.error('[memory] embed failed', e);
		return null;
	}
}
