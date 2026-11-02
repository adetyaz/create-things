/** Captured items and their analyses. */
import { sql } from 'drizzle-orm';
import { boolean, date, index, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { id, userId, stamp, createdAt, at } from './columns';
import { itemStatus, captureType, itemSize, difficulty } from './enums';

export const items = pgTable(
	'items',
	{
		id: id(),
		userId: userId(),
		title: text('title').notNull(),
		sourceUrl: text('source_url'),
		author: text('author'),
		platform: text('platform'),
		captureType: captureType('capture_type').notNull(),
		imageKey: text('image_key'),
		note: text('note'),
		status: itemStatus('status').notNull().default('inbox'),
		size: itemSize('size'),
		difficulty: difficulty('difficulty'),
		arenaBlockId: text('arena_block_id'),
		/** False when the title was made up from the URL or note, so analysis may replace it. */
		titleFromUser: boolean('title_from_user').notNull().default(false),
		/** Why the last analysis attempt failed; cleared when one succeeds. */
		analysisError: text('analysis_error'),
		/** Why the last roadmap job failed; cleared when one succeeds. */
		planError: text('plan_error'),
		/** Walrus `embed` vector, cached so fit-it-in doesn't re-embed (cost rule 4). */
		embedding: jsonb('embedding'),
		/** Hash of the text that was embedded; a different hash means embed again. */
		embeddingKey: text('embedding_key'),
		savedAt: stamp('saved_at'),
		lastActiveAt: at('last_active_at'),
		/** Out of Pick for me and plans until this day: not this month, or parked by fit-it-in. */
		parkedUntil: date('parked_until'),
		/** What they're trying to do: an id from features/intents/registry.ts (text, so no migration per intent). */
		intent: text('intent').notNull().default('make'),
		/** An id from features/intents/practice.ts, or null if unclear. */
		practiceKind: text('practice_kind'),
		/** Set when the user confirms the intent on the confirm card. */
		intentConfirmedAt: at('intent_confirmed_at'),
		/** "By the end you'll be able to…". */
		goal: text('goal'),
		targetDate: date('target_date')
	},
	(t) => [
		index('items_user_status_idx').on(t.userId, t.status),
		uniqueIndex('items_user_arena_block_idx')
			.on(t.userId, t.arenaBlockId)
			.where(sql`${t.arenaBlockId} is not null`)
	]
);

export const analyses = pgTable('analyses', {
	id: id(),
	itemId: uuid('item_id')
		.notNull()
		.references(() => items.id, { onDelete: 'cascade' }),
	summary: text('summary'),
	technique: text('technique'),
	/** `{ palette, notes }`: the extracted palette plus the model's description of color use. */
	colors: jsonb('colors'),
	typography: text('typography'),
	layout: text('layout'),
	mood: text('mood').array(),
	style: text('style'),
	components: text('components'),
	forDevelopers: text('for_developers'),
	forCreators: text('for_creators'),
	brief: text('brief'),
	skills: text('skills').array(),
	attribution: text('attribution'),
	model: text('model'),
	createdAt: createdAt()
});

/**
 * A screenshot or upload waiting to be analysed, until file storage (R2) exists: kept just long
 * enough for the analysis job to read it, then deleted.
 */
export const pendingImages = pgTable('pending_images', {
	itemId: uuid('item_id')
		.primaryKey()
		.references(() => items.id, { onDelete: 'cascade' }),
	mime: text('mime').notNull(),
	/** Base64 bytes. */
	data: text('data').notNull(),
	createdAt: createdAt()
});
