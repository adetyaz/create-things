/** Connected accounts (Are.na, Pinterest, Google Calendar) and collections (boards, channels, folders). */
import {
	index,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { id, userId, createdAt, at } from './columns';
import { items } from './items';

export const sourceConnections = pgTable(
	'source_connections',
	{
		userId: userId(),
		/** An id from features/sources/registry.ts: 'arena', 'pinterest', 'google_calendar'. */
		source: text('source').notNull(),
		/** AES-GCM encrypted with SOURCE_TOKEN_KEY; never returned by the API. */
		tokenEncrypted: text('token_encrypted').notNull(),
		refreshEncrypted: text('refresh_encrypted'),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		scopes: text('scopes'),
		/** Per-connection choices, e.g. Are.na write-back on. */
		settings: jsonb('settings').notNull().default({}),
		connectedAt: createdAt(),
		lastSyncAt: at('last_sync_at')
	},
	(t) => [primaryKey({ columns: [t.userId, t.source] })]
);

export const collections = pgTable(
	'collections',
	{
		id: id(),
		userId: userId(),
		title: text('title').notNull(),
		/** 'app', 'arena', 'pinterest', 'x'. */
		source: text('source').notNull().default('app'),
		/** The board, channel or folder id on that site. */
		externalId: text('external_id'),
		/** What new things in it become: 'triage' | 'shortlist' | 'reference'. */
		mode: text('mode').notNull().default('reference'),
		/** Linked to a goal: new things in it become that goal's references. */
		goalItemId: uuid('goal_item_id').references(() => items.id, { onDelete: 'set null' }),
		/** "What connects these", written once (§2b). */
		thread: text('thread'),
		createdAt: createdAt(),
		lastSyncAt: at('last_sync_at')
	},
	(t) => [
		uniqueIndex('collections_user_source_external_idx').on(t.userId, t.source, t.externalId),
		index('collections_user_idx').on(t.userId)
	]
);

export const collectionItems = pgTable(
	'collection_items',
	{
		collectionId: uuid('collection_id')
			.notNull()
			.references(() => collections.id, { onDelete: 'cascade' }),
		itemId: uuid('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		addedAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.collectionId, t.itemId] })]
);
