/**
 * Focus: what the user is working on now (1–3 items, default 1), and the decisions that move items
 * in and out of it. Each decision is remembered, so future picks learn from it.
 */
import { and, count, eq, inArray } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items, userSettings } from '$lib/server/db/schema';
import { remember, type NewMemory } from '$lib/server/features/memory/service';
import { startPlanning } from '$lib/server/features/roadmap/service';

type Platform = App.Platform | undefined;
type Item = typeof items.$inferSelect;

export type Decision = 'start' | 'not_today' | 'let_go';

export type DecideResult =
	| { status: 'started' | 'skipped' | 'let_go'; item: Item }
	| { status: 'at_limit'; limit: number; focus: Item[] }
	| { status: 'not_found' };

/** Items that can be started, skipped or let go from Pick for me. */
const PICKABLE = ['shortlist', 'ready', 'paused'] as const;

export function listFocus(platform: Platform, userId: string): Promise<Item[]> {
	return withDb(platform, (db) =>
		db
			.select()
			.from(items)
			.where(and(eq(items.userId, userId), eq(items.status, 'focus')))
	);
}

async function focusLimit(platform: Platform, userId: string): Promise<number> {
	const [row] = await withDb(platform, (db) =>
		db
			.select({ focusLimit: userSettings.focusLimit })
			.from(userSettings)
			.where(eq(userSettings.userId, userId))
	);
	return row?.focusLimit ?? 1;
}

export async function decide(
	platform: Platform,
	userId: string,
	itemId: string,
	decision: Decision
): Promise<DecideResult> {
	const [item] = await withDb(platform, (db) =>
		db
			.select()
			.from(items)
			.where(
				and(eq(items.id, itemId), eq(items.userId, userId), inArray(items.status, [...PICKABLE]))
			)
	);
	if (!item) return { status: 'not_found' };

	if (decision === 'not_today') {
		note(platform, userId, item, `Skipped "${item.title}" for today when it was suggested.`);
		return { status: 'skipped', item };
	}

	if (decision === 'let_go') {
		const updated = await setStatus(platform, item.id, 'archived');
		note(platform, userId, item, `Let go of "${item.title}": decided not to pursue it.`);
		return { status: 'let_go', item: updated };
	}

	const limit = await focusLimit(platform, userId);
	const [{ inFocus }] = await withDb(platform, (db) =>
		db
			.select({ inFocus: count() })
			.from(items)
			.where(and(eq(items.userId, userId), eq(items.status, 'focus')))
	);
	if (inFocus >= limit) {
		return { status: 'at_limit', limit, focus: await listFocus(platform, userId) };
	}
	const updated = await setStatus(platform, item.id, 'focus');
	note(platform, userId, item, `Started working on "${item.title}".`);
	// Starting makes the project and plans its roadmap in the background.
	await startPlanning(platform, userId, updated);
	return { status: 'started', item: updated };
}

/** Pause a Focus item: back to the Shortlist, progress kept. */
export async function pause(
	platform: Platform,
	userId: string,
	itemId: string
): Promise<Item | null> {
	const [updated] = await withDb(platform, (db) =>
		db
			.update(items)
			.set({ status: 'shortlist', lastActiveAt: new Date() })
			.where(and(eq(items.id, itemId), eq(items.userId, userId), eq(items.status, 'focus')))
			.returning()
	);
	if (updated) {
		note(
			platform,
			userId,
			updated,
			`Paused "${updated.title}" to make room for something else.`,
			'plan_change'
		);
	}
	return updated ?? null;
}

async function setStatus(
	platform: Platform,
	itemId: string,
	status: Item['status']
): Promise<Item> {
	const [updated] = await withDb(platform, (db) =>
		db
			.update(items)
			.set({ status, lastActiveAt: new Date() })
			.where(eq(items.id, itemId))
			.returning()
	);
	return updated;
}

/** Remembers a decision without slowing or failing the request. */
function note(
	platform: Platform,
	userId: string,
	item: Item,
	summary: string,
	type: NewMemory['type'] = 'pick_feedback'
) {
	const save = remember(platform, userId, {
		type,
		summary,
		sourceType: 'item',
		sourceId: item.id
	}).catch((e) => console.error('[focus] remember failed', e));
	platform?.ctx?.waitUntil(save);
}
