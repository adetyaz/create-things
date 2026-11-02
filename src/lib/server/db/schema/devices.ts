/** Device connection tokens: how the browser extension connects until sign-in exists. */
import { index, pgTable, text } from 'drizzle-orm/pg-core';
import { id, userId, createdAt, at } from './columns';

export const deviceTokens = pgTable(
	'device_tokens',
	{
		id: id(),
		userId: userId(),
		/** SHA-256 of the token; the token itself is shown once and never stored. */
		tokenHash: text('token_hash').notNull().unique(),
		label: text('label').notNull(),
		lastUsedAt: at('last_used_at'),
		revokedAt: at('revoked_at'),
		createdAt: createdAt()
	},
	(t) => [index('device_tokens_user_idx').on(t.userId)]
);
