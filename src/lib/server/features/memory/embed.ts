import { eq, inArray } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items } from '$lib/server/db/schema';
import { memoryClient } from '$lib/server/integrations/walrus/client';
import { namespaceFor } from './namespace';

type Platform = App.Platform | undefined;

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

/**
 * Embeddings for items, cached on the item and keyed by a hash of its text, so each item is only
 * embedded again when its text changes (Breakdown §13 cost rule 4). Null if embedding fails.
 */
export async function embedItems(
	platform: Platform,
	userId: string,
	list: { id: string; text: string }[]
): Promise<Map<string, number[]> | null> {
	const keyed = await Promise.all(list.map(async (i) => ({ ...i, key: await hash(i.text) })));
	const cached = await withDb(platform, (db) =>
		db
			.select({ id: items.id, embedding: items.embedding, key: items.embeddingKey })
			.from(items)
			.where(
				inArray(
					items.id,
					list.map((i) => i.id)
				)
			)
	);
	const vectors = new Map<string, number[]>();
	for (const c of cached) {
		if (c.embedding && c.key === keyed.find((k) => k.id === c.id)?.key) {
			vectors.set(c.id, c.embedding as number[]);
		}
	}
	const missing = keyed.filter((k) => !vectors.has(k.id));
	if (missing.length) {
		const fresh = await embedTexts(
			userId,
			missing.map((m) => m.text)
		);
		if (!fresh) return null;
		await withDb(platform, async (db) => {
			for (const [i, m] of missing.entries()) {
				vectors.set(m.id, fresh[i]);
				await db
					.update(items)
					.set({ embedding: fresh[i], embeddingKey: m.key })
					.where(eq(items.id, m.id));
			}
		});
	}
	return vectors;
}

async function hash(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
