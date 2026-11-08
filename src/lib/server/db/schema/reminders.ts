/** Reminders the pet sends, and busy times read from the user's calendar. */
import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { id, userId, createdAt, at } from './columns';

export const reminders = pgTable(
	'reminders',
	{
		id: id(),
		userId: userId(),
		/** An id from features/reminders/registry.ts (text, so no migration per kind). */
		kind: text('kind').notNull(),
		/** One reminder per key ("block:<slotId>", "reviews:2026-11-08"), so nothing repeats. */
		key: text('key').notNull(),
		title: text('title').notNull(),
		body: text('body').notNull(),
		/** What it's about, so it opens that thing: { itemId?, stepId?, slotId?, screen }. */
		link: jsonb('link').notNull().default({}),
		/** Buttons: [{ action: 'start' | 'two_minute' | 'move' | 'open' | 'done', label }]. */
		actions: jsonb('actions').notNull().default([]),
		dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
		createdAt: createdAt(),
		/** Set when a channel showed it (extension, email, push). */
		deliveredAt: at('delivered_at'),
		deliveredVia: text('delivered_via'),
		/** Set when acted on (started, moved, done) or dismissed. */
		actedAt: at('acted_at'),
		action: text('action')
	},
	(t) => [
		uniqueIndex('reminders_user_key_idx').on(t.userId, t.key),
		index('reminders_user_due_idx').on(t.userId, t.dueAt)
	]
);

export const busyTimes = pgTable(
	'busy_times',
	{
		id: id(),
		userId: userId(),
		/** 'ics' or 'google'. Only start, end and "busy": never titles. */
		source: text('source').notNull(),
		startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
		endsAt: timestamp('ends_at', { withTimezone: true }).notNull()
	},
	(t) => [index('busy_times_user_start_idx').on(t.userId, t.startsAt)]
);
