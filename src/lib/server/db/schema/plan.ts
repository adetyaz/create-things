/** Roadmaps, steps, time blocks, projects, journal and pomodoro sessions. */
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { id, userId, stamp, createdAt, at } from './columns';
import { roadmapStyle, progress, projectStatus, journalSource } from './enums';
import { items } from './items';

export const roadmaps = pgTable('roadmaps', {
	id: id(),
	itemId: uuid('item_id')
		.notNull()
		.references(() => items.id, { onDelete: 'cascade' }),
	style: roadmapStyle('style').notNull(),
	skills: jsonb('skills'),
	resources: jsonb('resources'),
	progress: progress('progress').notNull().default('not_started'),
	createdAt: createdAt()
});

export const roadmapSteps = pgTable(
	'roadmap_steps',
	{
		id: id(),
		roadmapId: uuid('roadmap_id')
			.notNull()
			.references(() => roadmaps.id, { onDelete: 'cascade' }),
		milestone: text('milestone').notNull(),
		position: integer('position').notNull(),
		title: text('title').notNull(),
		minutes: integer('minutes').notNull(),
		/** The smallest possible start, under 2 minutes. */
		twoMinute: text('two_minute'),
		/** What to type into a search engine for this step. */
		searchTerms: text('search_terms').array(),
		tools: text('tools').array(),
		doneAt: at('done_at')
	},
	(t) => [index('roadmap_steps_roadmap_idx').on(t.roadmapId, t.position)]
);

export const planSlots = pgTable(
	'plan_slots',
	{
		id: id(),
		userId: userId(),
		stepId: uuid('step_id')
			.notNull()
			.references(() => roadmapSteps.id, { onDelete: 'cascade' }),
		day: date('day').notNull(),
		position: integer('position').notNull().default(0)
	},
	(t) => [
		uniqueIndex('plan_slots_step_idx').on(t.stepId),
		index('plan_slots_user_day_idx').on(t.userId, t.day)
	]
);

export const projects = pgTable('projects', {
	id: id(),
	userId: userId(),
	itemId: uuid('item_id')
		.notNull()
		.references(() => items.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	status: projectStatus('status').notNull().default('ideating'),
	content: jsonb('content'),
	startedAt: stamp('started_at'),
	completedAt: at('completed_at')
});

export const journalEntries = pgTable(
	'journal_entries',
	{
		id: id(),
		userId: userId(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		source: journalSource('source').notNull().default('manual'),
		createdAt: createdAt()
	},
	(t) => [index('journal_entries_project_idx').on(t.projectId, t.createdAt)]
);

export const pomodoroSessions = pgTable(
	'pomodoro_sessions',
	{
		id: id(),
		userId: userId(),
		stepId: uuid('step_id').references(() => roadmapSteps.id, { onDelete: 'set null' }),
		startedAt: stamp('started_at'),
		endedAt: at('ended_at'),
		completed: boolean('completed').notNull().default(false),
		note: text('note')
	},
	(t) => [index('pomodoro_sessions_user_idx').on(t.userId, t.startedAt)]
);
