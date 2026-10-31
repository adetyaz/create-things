/**
 * Queue handler for `createthings-memory`: sends one memory summary to Walrus with `analyze`, which
 * extracts and stores the individual facts. Runs one message at a time (see wrangler.jsonc).
 */
import { eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { memories } from '$lib/server/db/schema';
import { memoryClient } from '$lib/server/integrations/walrus/client';
import { namespaceFor } from './namespace';

/** Queue message for `createthings-memory`. */
export interface MemoryJob {
	memoryId: string;
}

export type SendOutcome =
	| { status: 'sent'; memoryId: string; facts: number }
	| { status: 'skipped'; memoryId: string; reason: string };

/** Matches max_retries + 1 in wrangler.jsonc; after this the row is marked failed. */
const MAX_ATTEMPTS = 6;

export async function sendMemory(
	platform: App.Platform | undefined,
	job: MemoryJob
): Promise<SendOutcome> {
	const [row] = await withDb(platform, (db) =>
		db.select().from(memories).where(eq(memories.id, job.memoryId))
	);
	if (!row) return { status: 'skipped', memoryId: job.memoryId, reason: 'memory not found' };
	if (row.deletedAt) return { status: 'skipped', memoryId: row.id, reason: 'deleted' };
	// Never re-send: `analyze` has no idempotency key, so a second send would duplicate facts.
	if (row.status === 'sent') return { status: 'skipped', memoryId: row.id, reason: 'already sent' };

	try {
		const result = await memoryClient(namespaceFor(row.userId)).analyze(row.summary);
		await withDb(platform, (db) =>
			db
				.update(memories)
				.set({
					status: 'sent',
					walrusJobId: result.job_ids.join(','),
					attempts: row.attempts + 1,
					lastError: null
				})
				.where(eq(memories.id, row.id))
		);
		return { status: 'sent', memoryId: row.id, facts: result.fact_count };
	} catch (e) {
		const attempts = row.attempts + 1;
		await withDb(platform, (db) =>
			db
				.update(memories)
				.set({
					attempts,
					lastError: (e instanceof Error ? e.message : String(e)).slice(0, 2000),
					status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued'
				})
				.where(eq(memories.id, row.id))
		).catch(() => {});
		throw e; // the queue retries with backoff, then dead-letters
	}
}
