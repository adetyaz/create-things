/**
 * What the pet remembers. Postgres keeps every memory (the source of truth); Walrus gets the summary
 * through the memory queue. Summaries only, never raw journal text or transcripts.
 */
import { and, desc, eq, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { withDb, type Db } from '$lib/server/db';
import { memories, memoryType, userSettings } from '$lib/server/db/schema';
import { enqueue, type EnqueueResult } from '$lib/server/jobs';
import { memoryClient } from '$lib/server/integrations/walrus/client';
import { currentNamespace } from './namespace';
import { DELIVERY, digestSummary, type Delivery } from './delivery';

type Platform = App.Platform | undefined;
export type MemoryType = (typeof memoryType.enumValues)[number];
export type Memory = typeof memories.$inferSelect;

export interface NewMemory {
	type: MemoryType;
	/** A short summary in our words, never the user's raw text. */
	summary: string;
	sourceType?: string;
	sourceId?: string;
	/** Overrides the type's delivery (e.g. a pause is a small `plan_change`: digest). */
	delivery?: Delivery;
}

/**
 * Saves a memory. Rich and one-fact memories are queued for Walrus; small events wait for the
 * daily digest, which goes out with the first memory saved on a later day (cost rule 1).
 * Callers on a main path should catch and log failures.
 */
export async function remember(
	platform: Platform,
	userId: string,
	memory: NewMemory
): Promise<{ memoryId: string; delivery: EnqueueResult | 'in daily digest' }> {
	const delivery = memory.delivery ?? DELIVERY[memory.type];
	const [row] = await withDb(platform, (db) =>
		db
			.insert(memories)
			.values({
				userId,
				type: memory.type,
				summary: memory.summary.slice(0, 1000),
				sourceType: memory.sourceType ?? null,
				sourceId: memory.sourceId ?? null,
				delivery
			})
			.returning({ id: memories.id })
	);
	await sendDigest(platform, userId).catch((e) => console.error('[memory] digest failed', e));
	if (delivery === 'digest') return { memoryId: row.id, delivery: 'in daily digest' };
	return { memoryId: row.id, delivery: await enqueue(platform, 'memory', { memoryId: row.id }) };
}

/**
 * Rolls small events from earlier days into one memory per day and queues it. Today's events
 * keep waiting, so a day's digest is complete before it's sent.
 */
async function sendDigest(platform: Platform, userId: string): Promise<void> {
	const today = new Date().toISOString().slice(0, 10);
	const digests = await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			const pending = await tx
				.select({ id: memories.id, summary: memories.summary, createdAt: memories.createdAt })
				.from(memories)
				.where(
					and(
						eq(memories.userId, userId),
						eq(memories.delivery, 'digest'),
						isNull(memories.digestId),
						isNull(memories.deletedAt),
						lt(memories.createdAt, new Date(`${today}T00:00:00Z`))
					)
				)
				.orderBy(memories.createdAt);
			const byDay = new Map<string, typeof pending>();
			for (const p of pending) {
				const day = p.createdAt.toISOString().slice(0, 10);
				byDay.set(day, [...(byDay.get(day) ?? []), p]);
			}
			const created: string[] = [];
			for (const [day, events] of byDay) {
				const [digest] = await tx
					.insert(memories)
					.values({
						userId,
						type: 'work_pattern',
						summary: digestSummary(
							day,
							events.map((e) => e.summary)
						),
						sourceType: 'digest',
						delivery: 'remember'
					})
					.returning({ id: memories.id });
				await tx
					.update(memories)
					.set({ digestId: digest.id, status: 'sent' })
					.where(
						inArray(
							memories.id,
							events.map((e) => e.id)
						)
					);
				created.push(digest.id);
			}
			return created;
		})
	);
	for (const memoryId of digests) await enqueue(platform, 'memory', { memoryId });
}

/** The user's memories, newest first (deleted ones left out). */
export function listMemories(platform: Platform, userId: string): Promise<Memory[]> {
	return withDb(platform, (db) =>
		db
			.select()
			.from(memories)
			.where(and(eq(memories.userId, userId), isNull(memories.deletedAt)))
			.orderBy(desc(memories.createdAt))
			.limit(100)
	);
}

/** Memory types grouped in plain words for "What your pet knows". */
const GROUPS: { label: string; types: MemoryType[] }[] = [
	{ label: 'Your goals', types: ['goal', 'learning_goal'] },
	{ label: 'Plans and changes', types: ['plan', 'plan_change', 'idea_parked', 'idea_merged'] },
	{
		label: 'What you learned',
		types: ['lesson_learned', 'stuck_topic', 'review_weakness', 'session_summary']
	},
	{ label: 'How you work', types: ['work_pattern', 'pick_feedback', 'voice_ideas', 'expansion'] }
];

export interface MemoryGroup {
	label: string;
	memories: Memory[];
}

/** Groups memories for display, keeping each group newest first; unknown types go in "Other". */
export function groupMemories(list: Memory[]): MemoryGroup[] {
	const groups = GROUPS.map((g) => ({
		label: g.label,
		memories: list.filter((m) => g.types.includes(m.type))
	}));
	const known = new Set(GROUPS.flatMap((g) => g.types));
	const other = list.filter((m) => !known.has(m.type));
	return [...groups, ...(other.length ? [{ label: 'Other', memories: other }] : [])].filter(
		(g) => g.memories.length > 0
	);
}

/** What the app says after deleting, because Walrus can't erase data (Breakdown §13). */
export const DELETE_NOTE =
	"Removed from what your pet uses. Walrus can't erase data, so the encrypted copy there is never read again and expires on its own.";

export type DeleteResult =
	| { status: 'deleted'; hiddenFacts: number; note: string }
	| { status: 'not_found' };

/**
 * Deletes one memory: marks it deleted and looks up the Walrus blob ids of its facts, which recall
 * then leaves out. Nothing is re-sent or stored (Breakdown §13).
 */
export async function deleteMemory(
	platform: Platform,
	userId: string,
	memoryId: string
): Promise<DeleteResult> {
	const [row] = await withDb(platform, (db) =>
		db
			.update(memories)
			.set({ deletedAt: new Date() })
			.where(
				and(eq(memories.id, memoryId), eq(memories.userId, userId), isNull(memories.deletedAt))
			)
			.returning()
	);
	if (!row) return { status: 'not_found' };

	const blobIds = await blobIdsOf(platform, row);
	if (blobIds.length) {
		await withDb(platform, (db) =>
			db.update(memories).set({ blobIds }).where(eq(memories.id, row.id))
		);
	}
	return { status: 'deleted', hiddenFacts: blobIds.length, note: DELETE_NOTE };
}

/** The blob ids of a sent memory's facts, from its Walrus job ids, in one bulk lookup (cost rule 5). */
async function blobIdsOf(platform: Platform, row: Memory): Promise<string[]> {
	if (!row.walrusJobId) return [];
	const client = memoryClient(row.namespace ?? (await currentNamespace(platform, row.userId)));
	try {
		const { results } = await client.getRememberBulkStatus(row.walrusJobId.split(','));
		return results.flatMap((r) => (r.blob_id ? [r.blob_id] : []));
	} catch (e) {
		console.error('[memory] job lookup failed', row.id, e);
		return [];
	}
}

/** Blob ids of the user's deleted memories, which recall leaves out. */
export async function deletedBlobIds(platform: Platform, userId: string): Promise<Set<string>> {
	const rows = await withDb(platform, (db) =>
		db
			.select({ blobIds: memories.blobIds })
			.from(memories)
			.where(and(eq(memories.userId, userId), isNotNull(memories.deletedAt)))
	);
	return new Set(rows.flatMap((r) => r.blobIds ?? []));
}

/** Forgets everything: every memory marked deleted and a fresh, empty namespace. */
export async function forgetAll(
	platform: Platform,
	userId: string
): Promise<{ forgotten: number; note: string }> {
	const forgotten = await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			const rows = await tx
				.update(memories)
				.set({ deletedAt: new Date() })
				.where(and(eq(memories.userId, userId), isNull(memories.deletedAt)))
				.returning({ id: memories.id });
			await bumpNamespace(tx, userId);
			return rows.length;
		})
	);
	return { forgotten, note: DELETE_NOTE };
}

async function bumpNamespace(tx: Pick<Db, 'insert'>, userId: string) {
	await tx
		.insert(userSettings)
		.values({ userId, memoryNamespaceVersion: 1 })
		.onConflictDoUpdate({
			target: userSettings.userId,
			set: { memoryNamespaceVersion: sql`${userSettings.memoryNamespaceVersion} + 1` }
		});
}
