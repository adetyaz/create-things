/** Column helpers shared by the schema files. */
import { text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const id = () => uuid('id').primaryKey().defaultRandom();
export const userId = () => text('user_id').notNull();
/** A required timestamp that defaults to now. */
export const stamp = (name: string) =>
	timestamp(name, { withTimezone: true }).notNull().defaultNow();
export const createdAt = () => stamp('created_at');
export const at = (name: string) => timestamp(name, { withTimezone: true });
