/** Push subscriptions and sent notifications. */
import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { id, userId, stamp, createdAt } from './columns';
import { notifyChannel } from './enums';

export const pushSubscriptions = pgTable('push_subscriptions', {
	id: id(),
	userId: userId(),
	endpoint: text('endpoint').notNull().unique(),
	keys: jsonb('keys').notNull(),
	createdAt: createdAt()
});

export const notifications = pgTable(
	'notifications',
	{
		id: id(),
		userId: userId(),
		kind: text('kind').notNull(),
		channel: notifyChannel('channel').notNull(),
		sentAt: stamp('sent_at')
	},
	(t) => [index('notifications_user_idx').on(t.userId, t.sentAt)]
);
