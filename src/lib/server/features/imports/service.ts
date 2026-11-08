/**
 * Imports (Breakdown §2d): X bookmarks and Pinterest boards read from the page by the extension,
 * Are.na channels by its API. Everything comes in as references without analysis (free), into a
 * collection; nothing duplicates. One `expansion` memory per import, never one per item.
 */
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { analyses, collectionItems, collections, items } from '$lib/server/db/schema';
import { captureItem, retryAnalysis } from '$lib/server/features/items/service';
import { remember } from '$lib/server/features/memory/service';
import { costOf } from '$lib/server/features/credits/pricing';
import { ensureCollection } from '$lib/server/features/collections/service';
import type { ImportInput } from './input';

type Platform = App.Platform | undefined;

const SOURCE_NAMES = { x: 'X bookmarks', pinterest: 'Pinterest pins', arena: 'Are.na blocks' };

export interface ImportResult {
	collectionId: string;
	added: number;
	already: number;
}

/** A batch of things from one board / folder / channel (the extension sends 25 at a time). */
export async function importBatch(
	platform: Platform,
	userId: string,
	input: ImportInput
): Promise<ImportResult> {
	let added = 0;
	let already = 0;
	for (const thing of input.items) {
		const { analysis } = await captureItem(platform, userId, {
			captureType: 'url',
			sourceUrl: thing.url,
			title: thing.title,
			note: thing.text,
			asReference: true,
			analyse: false,
			external: { source: input.source, id: thing.externalId },
			collection: { source: input.source, ...input.collection }
		});
		if (analysis === 'already saved') already++;
		else added++;
	}
	const collection = await withDb(platform, (db) =>
		ensureCollection(db, userId, { source: input.source, ...input.collection })
	);
	await withDb(platform, (db) =>
		db.update(collections).set({ lastSyncAt: new Date() }).where(eq(collections.id, collection.id))
	);
	return { collectionId: collection.id, added, already };
}

/** Words that come up most in a collection's titles and notes (no AI): "riso, poster, grain". */
export function commonWords(texts: string[], limit = 4): string[] {
	const stop = new Set(
		'the and for with from this that your you are was have has how what when into about just more than then they them their our out new all can get not but one two its'.split(
			' '
		)
	);
	const counts = new Map<string, number>();
	for (const text of texts) {
		const seen = new Set(
			text
				.toLowerCase()
				.split(/[^a-z]+/)
				.filter((w) => w.length >= 4 && !stop.has(w) && !w.startsWith('http'))
		);
		for (const w of seen) counts.set(w, (counts.get(w) ?? 0) + 1);
	}
	return [...counts.entries()]
		.filter(([, n]) => n >= 2)
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([w]) => w);
}

/**
 * Finishes an import: one `expansion` memory saying what came in and what it's mostly about, so
 * picks, chat and what's next can use it (H3's last memory type). Returns the summary.
 */
export async function finishImport(
	platform: Platform,
	userId: string,
	collectionId: string,
	count: number
): Promise<string | null> {
	const found = await withDb(platform, async (db) => {
		const [collection] = await db
			.select()
			.from(collections)
			.where(and(eq(collections.id, collectionId), eq(collections.userId, userId)));
		if (!collection) return null;
		const rows = await db
			.select({ title: items.title, note: items.note })
			.from(collectionItems)
			.innerJoin(items, eq(items.id, collectionItems.itemId))
			.where(eq(collectionItems.collectionId, collectionId))
			.limit(300);
		return { collection, rows };
	});
	if (!found || count <= 0) return null;
	const words = commonWords(found.rows.map((r) => `${r.title} ${r.note ?? ''}`));
	const what = SOURCE_NAMES[found.collection.source as keyof typeof SOURCE_NAMES] ?? 'saves';
	const summary = `Brought in ${count} ${what} into "${found.collection.title}"${words.length ? `: mostly ${words.join(', ')}` : ''}.`;
	await remember(platform, userId, {
		type: 'expansion',
		summary,
		sourceType: 'collection',
		sourceId: collectionId
	}).catch((e) => console.error('[imports] remember failed', e));
	return summary;
}

/** How many in a collection still need analysis, and what analysing them costs (shown first). */
export async function analysisCost(platform: Platform, userId: string, collectionId: string) {
	const waiting = await unanalysed(platform, userId, collectionId, 1000);
	return {
		waiting: waiting.length,
		costEach: costOf('analysis'),
		costAll: waiting.length * costOf('analysis')
	};
}

async function unanalysed(platform: Platform, userId: string, collectionId: string, limit: number) {
	return withDb(platform, (db) =>
		db
			.select({ id: items.id })
			.from(collectionItems)
			.innerJoin(collections, eq(collections.id, collectionItems.collectionId))
			.innerJoin(items, eq(items.id, collectionItems.itemId))
			.leftJoin(analyses, eq(analyses.itemId, items.id))
			.where(
				and(
					eq(collections.id, collectionId),
					eq(collections.userId, userId),
					inArray(items.status, ['inbox', 'reference']),
					isNull(analyses.id)
				)
			)
			.orderBy(asc(collectionItems.addedAt))
			.limit(limit)
	);
}

/** "Analyse next" / "Analyse 20": queues the oldest unanalysed ones (each pays its own credits). */
export async function analyseNext(
	platform: Platform,
	userId: string,
	collectionId: string,
	count: number
) {
	const next = await unanalysed(platform, userId, collectionId, count);
	for (const { id } of next) await retryAnalysis(platform, userId, id);
	return { queued: next.length, cost: next.length * costOf('analysis') };
}
