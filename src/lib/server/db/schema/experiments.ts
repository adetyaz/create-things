/** A/B experiments: which variant each user got, and the outcomes we measure (no third parties). */
import { index, jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { id, userId, createdAt } from './columns';

export const experimentAssignments = pgTable(
	'experiment_assignments',
	{
		userId: userId(),
		/** An id from features/experiments/registry.ts. */
		experiment: text('experiment').notNull(),
		variant: text('variant').notNull(),
		assignedAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.userId, t.experiment] })]
);

export const productEvents = pgTable(
	'product_events',
	{
		id: id(),
		userId: userId(),
		/** 'onboarded', 'first_step_done', 'check_in', 'came_back', … */
		name: text('name').notNull(),
		data: jsonb('data'),
		createdAt: createdAt()
	},
	(t) => [index('product_events_user_name_idx').on(t.userId, t.name)]
);
