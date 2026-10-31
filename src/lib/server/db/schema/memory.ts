/** Assistant memory outbox (Walrus) and voice captures. */
import { index, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, userId, createdAt, at } from './columns';
import { memoryType, memoryStatus } from './enums';

/** Local copy of every memory, and the outbox the queue drains into Walrus. */
export const memories = pgTable(
	'memories',
	{
		id: id(),
		userId: userId(),
		type: memoryType('type').notNull(),
		summary: text('summary').notNull(),
		sourceType: text('source_type'),
		sourceId: uuid('source_id'),
		status: memoryStatus('status').notNull().default('queued'),
		attempts: integer('attempts').notNull().default(0),
		lastError: text('last_error'),
		walrusJobId: text('walrus_job_id'),
		/** The Walrus namespace it was sent to; deleting moves the user to a new one (Breakdown §13). */
		namespace: text('namespace'),
		/** Walrus blob ids of its facts, looked up on delete so recall can leave them out. */
		blobIds: text('blob_ids').array(),
		/** analyze, remember or digest (Breakdown §13 cost rules). */
		delivery: text('delivery').notNull().default('analyze'),
		/** For a small event: the daily digest memory it was sent in. */
		digestId: uuid('digest_id'),
		createdAt: createdAt(),
		deletedAt: at('deleted_at')
	},
	(t) => [
		index('memories_user_idx').on(t.userId, t.createdAt),
		index('memories_outbox_idx').on(t.status, t.createdAt)
	]
);

export const voiceCaptures = pgTable('voice_captures', {
	id: id(),
	userId: userId(),
	audioKey: text('audio_key'),
	transcript: text('transcript'),
	ideas: jsonb('ideas'),
	createdAt: createdAt()
});
