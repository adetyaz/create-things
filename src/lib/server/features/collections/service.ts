/**
 * Collections (Breakdown §2b): boards, channels and folders from other sites, and groups made in
 * the app. Never a chore: they arrive ready-made from imports and copies. A collection can be
 * linked to a goal, so what's in it becomes that goal's references.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { withDb, type Db } from '$lib/server/db';
import { collectionItems, collections, items } from '$lib/server/db/schema';

type Platform = App.Platform | undefined;
export type Collection = typeof collections.$inferSelect;

export interface CollectionRef {
	source: 'app' | 'x' | 'pinterest' | 'arena';
	externalId?: string;
	title: string;
}

/** The collection for a board / folder / channel, made the first time it's seen. */
export async function ensureCollection(
	db: Pick<Db, 'select' | 'insert'>,
	userId: string,
	ref: CollectionRef
): Promise<Collection> {
	const externalId = ref.externalId ?? (ref.source === 'app' ? null : ref.title);
	if (externalId) {
		const [found] = await db
			.select()
			.from(collections)
			.where(
				and(
					eq(collections.userId, userId),
					eq(collections.source, ref.source),
					eq(collections.externalId, externalId)
				)
			);
		if (found) return found;
	}
	const [made] = await db
		.insert(collections)
		.values({ userId, title: ref.title, source: ref.source, externalId })
		.onConflictDoNothing()
		.returning();
	if (made) return made;
	const [again] = await db
		.select()
		.from(collections)
		.where(
			and(
				eq(collections.userId, userId),
				eq(collections.source, ref.source),
				eq(collections.externalId, externalId!)
			)
		);
	return again;
}

export async function addToCollection(
	db: Pick<Db, 'insert'>,
	collectionId: string,
	itemIds: string[]
) {
	if (!itemIds.length) return;
	await db
		.insert(collectionItems)
		.values(itemIds.map((itemId) => ({ collectionId, itemId })))
		.onConflictDoNothing();
}

/** The user's collections with how many things each holds, newest first. */
export function listCollections(platform: Platform, userId: string) {
	return withDb(platform, (db) =>
		db
			.select({
				id: collections.id,
				title: collections.title,
				source: collections.source,
				mode: collections.mode,
				goalItemId: collections.goalItemId,
				thread: collections.thread,
				lastSyncAt: collections.lastSyncAt,
				count: sql<number>`(select count(*)::int from ${collectionItems} ci where ci.collection_id = ${collections.id})`
			})
			.from(collections)
			.where(eq(collections.userId, userId))
			.orderBy(desc(collections.createdAt))
	);
}

/** One collection and its items (newest first), or null. */
export async function getCollection(platform: Platform, userId: string, id: string) {
	return withDb(platform, async (db) => {
		const [collection] = await db
			.select()
			.from(collections)
			.where(and(eq(collections.id, id), eq(collections.userId, userId)));
		if (!collection) return null;
		const list = await db
			.select({
				id: items.id,
				title: items.title,
				status: items.status,
				sourceUrl: items.sourceUrl,
				platform: items.platform,
				analysed: sql<boolean>`${items.size} is not null`
			})
			.from(collectionItems)
			.innerJoin(items, eq(items.id, collectionItems.itemId))
			.where(eq(collectionItems.collectionId, id))
			.orderBy(desc(collectionItems.addedAt))
			.limit(500);
		return { collection, items: list };
	});
}

export async function createCollection(
	platform: Platform,
	userId: string,
	title: string,
	itemIds: string[] = []
) {
	return withDb(platform, (db) =>
		db.transaction(async (tx) => {
			const made = await ensureCollection(tx, userId, { source: 'app', title });
			const owned = itemIds.length
				? await tx
						.select({ id: items.id })
						.from(items)
						.where(and(eq(items.userId, userId), inArray(items.id, itemIds)))
				: [];
			await addToCollection(
				tx,
				made.id,
				owned.map((o) => o.id)
			);
			return made;
		})
	);
}

/** Adds the user's items to a collection. False: no such collection. */
export async function addItems(platform: Platform, userId: string, id: string, itemIds: string[]) {
	return withDb(platform, async (db) => {
		const [collection] = await db
			.select({ id: collections.id })
			.from(collections)
			.where(and(eq(collections.id, id), eq(collections.userId, userId)));
		if (!collection) return false;
		const owned = await db
			.select({ id: items.id })
			.from(items)
			.where(and(eq(items.userId, userId), inArray(items.id, itemIds)));
		await addToCollection(
			db,
			id,
			owned.map((o) => o.id)
		);
		return true;
	});
}

/**
 * Renames, changes what new things become, or links the collection to a goal (null unlinks). Linked:
 * its items become references for that goal (they're kept, never tasks).
 */
export async function updateCollection(
	platform: Platform,
	userId: string,
	id: string,
	update: {
		title?: string;
		mode?: 'triage' | 'shortlist' | 'reference';
		goalItemId?: string | null;
	}
) {
	return withDb(platform, async (db) => {
		if (update.goalItemId) {
			const [goal] = await db
				.select({ id: items.id })
				.from(items)
				.where(and(eq(items.id, update.goalItemId), eq(items.userId, userId)));
			if (!goal) return null;
		}
		const [row] = await db
			.update(collections)
			.set(update)
			.where(and(eq(collections.id, id), eq(collections.userId, userId)))
			.returning();
		return row ?? null;
	});
}

/** References linked to a goal through its collections (for its roadmap and project space). */
export async function referencesForGoal(platform: Platform, userId: string, goalItemId: string) {
	return withDb(platform, (db) =>
		db
			.selectDistinct({ id: items.id, title: items.title, sourceUrl: items.sourceUrl })
			.from(collections)
			.innerJoin(collectionItems, eq(collectionItems.collectionId, collections.id))
			.innerJoin(items, eq(items.id, collectionItems.itemId))
			.where(and(eq(collections.userId, userId), eq(collections.goalItemId, goalItemId)))
			.limit(50)
	);
}
