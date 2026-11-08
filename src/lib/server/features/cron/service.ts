/**
 * Daily jobs (Cloudflare cron → scripts/worker-entry.js scheduled() → /api/internal/cron):
 * Are.na sync, and on Mondays one "what you're drawn to" memory per user (US-102).
 */
import { and, eq, gte, sql } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { collectionItems, collections, items } from '$lib/server/db/schema';
import { syncAll } from '$lib/server/features/arena/service';
import { commonWords } from '$lib/server/features/imports/service';
import { remember } from '$lib/server/features/memory/service';

type Platform = App.Platform | undefined;

const SOURCE_NAMES: Record<string, string> = {
	arena: 'Are.na',
	pinterest: 'Pinterest',
	x: 'X',
	app: 'createthings'
};

/**
 * One memory per user about the last 7 days of saving: where it went and what it's mostly about
 * ("Saved 9 to 'riso' (Are.na) and 4 to 'X bookmarks': mostly poster, grain"). Never one per save.
 */
export async function drawnTo(platform: Platform, userId?: string) {
	const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const rows = await withDb(platform, (db) =>
		db
			.select({
				userId: collections.userId,
				collection: collections.title,
				source: collections.source,
				count: sql<number>`count(*)::int`,
				texts: sql<string[]>`array_agg(${items.title} || ' ' || coalesce(${items.note}, ''))`
			})
			.from(collectionItems)
			.innerJoin(collections, eq(collections.id, collectionItems.collectionId))
			.innerJoin(items, eq(items.id, collectionItems.itemId))
			.where(
				and(
					gte(collectionItems.addedAt, since),
					userId ? eq(collections.userId, userId) : undefined
				)
			)
			.groupBy(collections.userId, collections.title, collections.source)
	);
	const byUser = new Map<string, typeof rows>();
	for (const row of rows) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row]);

	const sent: { userId: string; summary: string }[] = [];
	for (const [user, list] of byUser) {
		const top = list.sort((a, b) => b.count - a.count).slice(0, 3);
		const words = commonWords(list.flatMap((r) => r.texts));
		const where = top
			.map((r) => `${r.count} to "${r.collection}" (${SOURCE_NAMES[r.source] ?? r.source})`)
			.join(' and ');
		const summary = `This week they saved ${where}${words.length ? `: mostly ${words.join(', ')}` : ''}.`;
		await remember(platform, user, {
			type: 'expansion',
			summary,
			sourceType: 'weekly_drawn_to'
		}).catch((e) => console.error('[cron] drawn-to memory failed', user, e));
		sent.push({ userId: user, summary });
	}
	return sent;
}

/** Everything the daily cron does. Mondays add the weekly memory. */
export async function runDaily(platform: Platform, now = new Date()) {
	const arena = await syncAll(platform).catch((e) => ({ error: String(e) }));
	const weekly = now.getUTCDay() === 1 ? await drawnTo(platform) : 'not Monday';
	return { arena, weekly };
}
