/**
 * Better Auth's tables (sign-in with Google or a magic link). Property names are what Better Auth
 * expects; columns are snake_case like the rest of the schema. Every other table's `user_id` holds
 * `user.id`.
 */
import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

const time = (name: string) => timestamp(name, { withTimezone: true });

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	createdAt: time('created_at').notNull().defaultNow(),
	updatedAt: time('updated_at').notNull().defaultNow()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: time('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: time('created_at').notNull().defaultNow(),
		updatedAt: time('updated_at').notNull().defaultNow(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(t) => [index('session_user_idx').on(t.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: time('access_token_expires_at'),
		refreshTokenExpiresAt: time('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: time('created_at').notNull().defaultNow(),
		updatedAt: time('updated_at').notNull().defaultNow()
	},
	(t) => [index('account_user_idx').on(t.userId)]
);

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: time('expires_at').notNull(),
	createdAt: time('created_at').notNull().defaultNow(),
	updatedAt: time('updated_at').notNull().defaultNow()
});
