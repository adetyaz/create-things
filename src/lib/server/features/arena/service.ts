/**
 * Are.na (Breakdown §2, S3–S8): choose channels and what their blocks become (to-do / curated /
 * references), import and sync daily (known blocks skipped), link a channel to a goal, and share
 * what you made back with your OK. Blocks come in without analysis (analysed when used).
 */
import { and, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { collections, items, sourceConnections } from '$lib/server/db/schema';
import { captureItem } from '$lib/server/features/items/service';
import { ensureCollection } from '$lib/server/features/collections/service';
import { finishImport } from '$lib/server/features/imports/service';
import { accessToken, connectionOf, markSynced } from '$lib/server/features/sources/service';
import { addBlock, blockToSave, channelPage, me, myChannels } from './client';

type Platform = App.Platform | undefined;
export type ChannelMode = 'triage' | 'shortlist' | 'reference';

/** Pages read per channel per sync (100 blocks each), so one sync stays quick and polite. */
const PAGES_PER_SYNC = 3;

async function tokenFor(platform: Platform, userId: string): Promise<string> {
	const token = await accessToken(platform, userId, 'arena');
	if (!token) throw new Error('Are.na is not connected');
	return token;
}

/** The user's channels, with which are already brought in. */
export async function listChannels(platform: Platform, userId: string) {
	const token = await tokenFor(platform, userId);
	const user = await me(token);
	const { channels, more } = await myChannels(token, user.id);
	const linked = await withDb(platform, (db) =>
		db
			.select({ externalId: collections.externalId, mode: collections.mode, id: collections.id })
			.from(collections)
			.where(and(eq(collections.userId, userId), eq(collections.source, 'arena')))
	);
	return {
		user: { slug: user.slug, name: user.name ?? user.slug },
		channels: channels.map((c) => {
			const found = linked.find((l) => l.externalId === String(c.id));
			return {
				id: c.id,
				slug: c.slug,
				title: c.title,
				blocks: c.length ?? c.counts?.contents ?? null,
				collectionId: found?.id ?? null,
				mode: found?.mode ?? null
			};
		}),
		more
	};
}

/** Brings a channel in: its collection (with the mode), then the first sync. */
export async function connectChannel(
	platform: Platform,
	userId: string,
	channel: { id: number; title: string },
	mode: ChannelMode
) {
	const collection = await withDb(platform, async (db) => {
		const c = await ensureCollection(db, userId, {
			source: 'arena',
			externalId: String(channel.id),
			title: channel.title
		});
		await db.update(collections).set({ mode }).where(eq(collections.id, c.id));
		return c;
	});
	const synced = await syncChannel(platform, userId, collection.id);
	const summary = synced.added
		? await finishImport(platform, userId, collection.id, synced.added)
		: null;
	return { collectionId: collection.id, ...synced, summary };
}

/** New blocks from one channel (newest first; stops at the first page with nothing new). */
export async function syncChannel(platform: Platform, userId: string, collectionId: string) {
	const [collection] = await withDb(platform, (db) =>
		db
			.select()
			.from(collections)
			.where(
				and(
					eq(collections.id, collectionId),
					eq(collections.userId, userId),
					eq(collections.source, 'arena')
				)
			)
	);
	if (!collection?.externalId) throw new Error('Not an Are.na channel');
	const token = await tokenFor(platform, userId);
	const mode = collection.mode as ChannelMode;
	let added = 0;
	let already = 0;
	for (let page = 1; page <= PAGES_PER_SYNC; page++) {
		const { blocks, more } = await channelPage(token, collection.externalId, page);
		let newHere = 0;
		for (const block of blocks) {
			const save = blockToSave(block);
			const { item, analysis } = await captureItem(platform, userId, {
				captureType: 'url',
				sourceUrl: save.url,
				title: save.title,
				note: save.text,
				asReference: mode === 'reference',
				analyse: false,
				external: { source: 'arena', id: save.externalId },
				collection: { source: 'arena', externalId: collection.externalId, title: collection.title }
			});
			if (analysis === 'already saved') {
				already++;
				continue;
			}
			newHere++;
			added++;
			// "Already curated": straight to the Shortlist; also mark which block it was.
			await withDb(platform, (db) =>
				db
					.update(items)
					.set({
						arenaBlockId: save.externalId,
						...(mode === 'shortlist' ? { status: 'shortlist' as const } : {})
					})
					.where(eq(items.id, item.id))
			);
		}
		if (!more || !newHere) break;
	}
	await withDb(platform, (db) =>
		db.update(collections).set({ lastSyncAt: new Date() }).where(eq(collections.id, collection.id))
	);
	await markSynced(platform, userId, 'arena');
	return { added, already };
}

/** The daily sync for every Are.na connection (the cron). */
export async function syncAll(platform: Platform) {
	const rows = await withDb(platform, (db) =>
		db
			.select({ userId: collections.userId, id: collections.id })
			.from(collections)
			.innerJoin(
				sourceConnections,
				and(eq(sourceConnections.userId, collections.userId), eq(sourceConnections.source, 'arena'))
			)
			.where(eq(collections.source, 'arena'))
	);
	const results = [];
	for (const row of rows) {
		try {
			results.push({ collectionId: row.id, ...(await syncChannel(platform, row.userId, row.id)) });
		} catch (e) {
			results.push({ collectionId: row.id, error: e instanceof Error ? e.message : String(e) });
		}
	}
	return results;
}

/**
 * Write-back (US-103): adds what you made to your "made with createthings" channel. Only called
 * after the user says yes; needs write-back switched on and the channel chosen in settings.
 */
export async function shareBack(
	platform: Platform,
	userId: string,
	itemId: string,
	description?: string
) {
	const connection = await connectionOf(platform, userId, 'arena');
	const settings = (connection?.settings ?? {}) as { writeBack?: boolean; shareChannelId?: number };
	if (!connection || !settings.writeBack || !settings.shareChannelId) {
		return { status: 'off' as const, message: 'Switch on sharing back and choose a channel first' };
	}
	const [item] = await withDb(platform, (db) =>
		db
			.select({ title: items.title, sourceUrl: items.sourceUrl, status: items.status })
			.from(items)
			.where(and(eq(items.id, itemId), eq(items.userId, userId)))
	);
	if (!item) return { status: 'not_found' as const };
	const token = await tokenFor(platform, userId);
	const block = await addBlock(
		token,
		settings.shareChannelId,
		item.sourceUrl ?? `Made: ${item.title}`,
		description ?? `Made with createthings: ${item.title}`
	);
	return { status: 'shared' as const, blockId: block.id };
}
