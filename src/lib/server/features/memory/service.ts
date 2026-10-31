/**
 * What the pet remembers. Postgres keeps every memory (the source of truth); Walrus gets the summary
 * through the memory queue. Summaries only, never raw journal text or transcripts.
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { memories, memoryType } from '$lib/server/db/schema';
import { enqueue, type EnqueueResult } from '$lib/server/jobs';

type Platform = App.Platform | undefined;
export type MemoryType = (typeof memoryType.enumValues)[number];
export type Memory = typeof memories.$inferSelect;

export interface NewMemory {
	type: MemoryType;
	/** A short summary in our words, never the user's raw text. */
	summary: string;
	sourceType?: string;
	sourceId?: string;
}

/** Saves a memory and queues it for Walrus. Callers on a main path should catch and log failures. */
export async function remember(
	platform: Platform,
	userId: string,
	memory: NewMemory
): Promise<{ memoryId: string; delivery: EnqueueResult }> {
	const [row] = await withDb(platform, (db) =>
		db
			.insert(memories)
			.values({
				userId,
				type: memory.type,
				summary: memory.summary.slice(0, 1000),
				sourceType: memory.sourceType ?? null,
				sourceId: memory.sourceId ?? null
			})
			.returning({ id: memories.id })
	);
	const delivery = await enqueue(platform, 'memory', { memoryId: row.id });
	return { memoryId: row.id, delivery };
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
