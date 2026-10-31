/** Knowledge cards and spaced review. */
import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, userId, createdAt, at } from './columns';
import { cardSource, cardType, rating } from './enums';
import { items } from './items';

export const knowledgeCards = pgTable(
	'knowledge_cards',
	{
		id: id(),
		userId: userId(),
		itemId: uuid('item_id').references(() => items.id, { onDelete: 'set null' }),
		sourceType: cardSource('source_type').notNull(),
		sourceId: uuid('source_id'),
		type: cardType('type').notNull(),
		prompt: text('prompt').notNull(),
		answer: text('answer').notNull(),
		intervalDays: integer('interval_days').notNull().default(1),
		nextReviewAt: at('next_review_at').notNull().defaultNow(),
		lastRating: rating('last_rating'),
		reviewCount: integer('review_count').notNull().default(0),
		createdAt: createdAt()
	},
	(t) => [index('knowledge_cards_due_idx').on(t.userId, t.nextReviewAt)]
);
