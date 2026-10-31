/** Are.na and export connections. */
import { pgTable, primaryKey, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { id, userId, at } from './columns';
import { channelMode, exportTarget } from './enums';

export const arenaConnections = pgTable('arena_connections', {
	userId: text('user_id').primaryKey(),
	tokenEncrypted: text('token_encrypted').notNull(),
	lastSyncAt: at('last_sync_at')
});

export const arenaChannels = pgTable(
	'arena_channels',
	{
		id: id(),
		userId: userId(),
		slug: text('slug').notNull(),
		mode: channelMode('mode').notNull().default('triage')
	},
	(t) => [uniqueIndex('arena_channels_user_slug_idx').on(t.userId, t.slug)]
);

export const exports = pgTable(
	'exports',
	{
		userId: userId(),
		target: exportTarget('target').notNull(),
		tokenEncrypted: text('token_encrypted').notNull(),
		lastRunAt: at('last_run_at')
	},
	(t) => [primaryKey({ columns: [t.userId, t.target] })]
);
