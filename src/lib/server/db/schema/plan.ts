/** Roadmaps, steps, time blocks, projects, journal and pomodoro sessions. */
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	time,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { id, userId, stamp, createdAt, at } from './columns';
import { roadmapStyle, progress, projectStatus, journalSource, planPeriodKind } from './enums';
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
	/** "By the end you'll be able to…": what every milestone builds toward. */
	goal: text('goal'),
	/** The 2–3 goals suggested when the roadmap was made, for the user to choose from. */
	goalOptions: jsonb('goal_options'),
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
		/** Learning steps end with a recall question ("close the tab: what do you remember?"). */
		recall: text('recall'),
		/** 'step', or 'proof' for a proving ground: a real song, lab or piece using what's been learned. */
		kind: text('kind').notNull().default('step'),
		doneAt: at('done_at')
	},
	(t) => [index('roadmap_steps_roadmap_idx').on(t.roadmapId, t.position)]
);

/** A step placed in a time block. `position` is its rank within the day (1–3 = the day's top 3). */
export const planSlots = pgTable(
	'plan_slots',
	{
		id: id(),
		userId: userId(),
		stepId: uuid('step_id')
			.notNull()
			.references(() => roadmapSteps.id, { onDelete: 'cascade' }),
		day: date('day').notNull(),
		startTime: time('start_time'),
		/** A habit to follow instead of a clock time, e.g. "after coffee". */
		anchor: text('anchor'),
		place: text('place'),
		position: integer('position').notNull().default(0),
		missedAt: at('missed_at')
	},
	(t) => [
		uniqueIndex('plan_slots_step_idx').on(t.stepId),
		index('plan_slots_user_day_idx').on(t.userId, t.day)
	]
);

/** One row per month or week the user planned: the month's goals, the week's block count, the review. */
export const planPeriods = pgTable(
	'plan_periods',
	{
		id: id(),
		userId: userId(),
		kind: planPeriodKind('kind').notNull(),
		startsOn: date('starts_on').notNull(),
		goalItemIds: uuid('goal_item_ids').array(),
		blocksWanted: integer('blocks_wanted'),
		review: text('review'),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('plan_periods_user_kind_start_idx').on(t.userId, t.kind, t.startsOn)]
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

/** A course's units in order, read from its syllabus. The course roadmap has one milestone each. */
export const courseUnits = pgTable(
	'course_units',
	{
		id: id(),
		itemId: uuid('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		title: text('title').notNull(),
		topics: text('topics').array(),
		/** The class or due date for this unit, when the syllabus gives one. */
		unitDate: date('unit_date')
	},
	(t) => [index('course_units_item_idx').on(t.itemId, t.position)]
);
