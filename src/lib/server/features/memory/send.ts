/**
 * Queue handler for `createthings-memory`: sends one memory to Walrus, with `analyze` (split into
 * facts) or `remember` (stored whole) by its delivery (Breakdown §13 cost rules). Runs one message
 * at a time (see wrangler.jsonc).
 */
import { eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { memories } from '$lib/server/db/schema';
import { memoryClient } from '$lib/server/integrations/walrus/client';
import { currentNamespace } from './namespace';

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
	// Small events go out inside the daily digest, never on their own.
	if (row.delivery === 'digest') return { status: 'skipped', memoryId: row.id, reason: 'digest' };
	// Never re-send: `analyze` has no idempotency key, so a second send would duplicate facts.
	if (row.status === 'sent') return { status: 'skipped', memoryId: row.id, reason: 'already sent' };

	try {
		const namespace = await currentNamespace(platform, row.userId);
		const client = memoryClient(namespace);
		// Cost rule 2: rich memories are split into facts (analyze, 10 points); one-fact memories are
		// stored whole (remember, 5 points), deduplicated and safe to retry (rule 3).
		const result =
			row.delivery === 'remember'
				? await client
						.remember(row.summary, { idempotencyKey: row.id, dedupe: true })
						.then((r) => ({ job_ids: [r.job_id], fact_count: 1 }))
				: await client.analyze(row.summary);
		await withDb(platform, (db) =>
			db
				.update(memories)
				.set({
					status: 'sent',
					walrusJobId: result.job_ids.join(','),
					namespace,
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
