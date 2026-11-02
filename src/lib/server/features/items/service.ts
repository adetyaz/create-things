/** Items: capture, list, read and retry. Routes call these; other features reuse them. */
import { and, desc, eq, inArray } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { analyses, items, pendingImages } from '$lib/server/db/schema';
import { enqueue, type EnqueueResult } from '$lib/server/jobs';
import { forgetSource } from '$lib/server/features/memory/service';
import type { CaptureInput } from './input';

type Platform = App.Platform | undefined;
export type Item = typeof items.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;

/** Saves a capture (Inbox, or Reference) and queues its analysis. */
export async function captureItem(
	platform: Platform,
	userId: string,
	input: CaptureInput
): Promise<{ item: Item; analysis: EnqueueResult }> {
	const sourceUrl = input.captureType === 'note' ? null : (input.sourceUrl ?? null);
	const note = input.note ?? null;
	const host = sourceUrl ? new URL(sourceUrl).hostname : null;

	const item = await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			const [item] = await tx
				.insert(items)
				.values({
					userId,
					title: input.title ?? host ?? note?.slice(0, 60) ?? 'Screenshot',
					titleFromUser: !!input.title,
					captureType: input.captureType,
					status: input.asReference ? 'reference' : 'inbox',
					sourceUrl,
					note,
					platform: host?.replace(/^www\./, '') ?? null
				})
				.returning();
			// Until file storage exists, a screenshot waits here for its analysis, then is deleted.
			if (input.captureType === 'screenshot') {
				await tx
					.insert(pendingImages)
					.values({ itemId: item.id, mime: input.mime, data: input.image });
			}
			return item;
		})
	);

	const analysis = await enqueue(platform, 'analysis', {
		itemId: item.id,
		palette: input.palette ?? null
	});
	return { item, analysis };
}

/** The user's items, newest first. */
export function listItems(platform: Platform, userId: string): Promise<Item[]> {
	return withDb(platform, (db) =>
		db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.savedAt)).limit(100)
	);
}

/** One item with its latest analysis (null until the job finishes), or null if it isn't theirs. */
export function getItemWithAnalysis(
	platform: Platform,
	userId: string,
	id: string
): Promise<{ item: Item; analysis: Analysis | null } | null> {
	return withDb(platform, async (db) => {
		const [item] = await db
			.select()
			.from(items)
			.where(and(eq(items.id, id), eq(items.userId, userId)));
		if (!item) return null;
		const [analysis] = await db
			.select()
			.from(analyses)
			.where(eq(analyses.itemId, id))
			.orderBy(desc(analyses.createdAt))
			.limit(1);
		return { item, analysis: analysis ?? null };
	});
}

/** Re-queues analysis for an item still in the inbox. Null if there's no such inbox item. */
export async function retryAnalysis(
	platform: Platform,
	userId: string,
	id: string
): Promise<{ itemId: string; analysis: EnqueueResult } | null> {
	const [item] = await withDb(platform, (db) =>
		db
			.update(items)
			.set({ analysisError: null })
			.where(and(eq(items.id, id), eq(items.userId, userId), eq(items.status, 'inbox')))
			.returning({ id: items.id })
	);
	if (!item) return null;
	return { itemId: item.id, analysis: await enqueue(platform, 'analysis', { itemId: item.id }) };
}

/** Statuses where a save can still be undone: nothing has been planned or done with it yet. */
const UNDOABLE = ['inbox', 'ready', 'reference'] as const;

/**
 * Undoes a save (the extension's toast): removes the item and hides any memory it made.
 * Null if it isn't theirs or is already in use (shortlisted, planned, done: archive those instead).
 * An analysis still running finds the item gone and refunds its credits.
 */
export async function undoCapture(
	platform: Platform,
	userId: string,
	id: string
): Promise<{ removed: true; hiddenMemories: number } | null> {
	const [item] = await withDb(platform, (db) =>
		db
			.delete(items)
			.where(and(eq(items.id, id), eq(items.userId, userId), inArray(items.status, UNDOABLE)))
			.returning({ id: items.id })
	);
	if (!item) return null;
	return { removed: true, hiddenMemories: await forgetSource(platform, userId, 'item', id) };
}

/**
 * Switches a fresh save between "do this" and "keep as reference". A reference isn't a goal, so
 * its goal memory is hidden. Back to "do this": Ready if analysed, else Inbox (the goal memory
 * comes with the next analysis or plan, not re-sent here, to save Walrus calls).
 * Null if it isn't theirs or is already in use.
 */
export async function setReference(
	platform: Platform,
	userId: string,
	id: string,
	reference: boolean
): Promise<Item | null> {
	const current = await getItemWithAnalysis(platform, userId, id);
	if (!current || !(UNDOABLE as readonly string[]).includes(current.item.status)) return null;
	const status = reference ? 'reference' : current.analysis ? 'ready' : 'inbox';
	const [item] = await withDb(platform, (db) =>
		db
			.update(items)
			.set({ status, lastActiveAt: new Date() })
			.where(and(eq(items.id, id), eq(items.status, current.item.status)))
			.returning()
	);
	if (item && reference) await forgetSource(platform, userId, 'item', id);
	return item ?? null;
}

export type TriageDecision = 'keep' | 'let_go' | 'later';

/**
 * Sorts an analysed item: keep → Shortlist, let go → Archived, later → stays Ready.
 * Null if the item isn't the user's or isn't waiting to be sorted.
 */
export async function triageItem(
	platform: Platform,
	userId: string,
	id: string,
	decision: TriageDecision
): Promise<Item | null> {
	const status = decision === 'keep' ? 'shortlist' : decision === 'let_go' ? 'archived' : 'ready';
	const [item] = await withDb(platform, (db) =>
		db
			.update(items)
			.set({ status, lastActiveAt: new Date() })
			.where(and(eq(items.id, id), eq(items.userId, userId), eq(items.status, 'ready')))
			.returning()
	);
	return item ?? null;
}
