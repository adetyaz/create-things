/** Per-user settings. */
import { boolean, integer, pgTable, text, time } from 'drizzle-orm/pg-core';
import { at } from './columns';

export const userSettings = pgTable('user_settings', {
	userId: text('user_id').primaryKey(),
	focusLimit: integer('focus_limit').notNull().default(1),
	dailyReviewCap: integer('daily_review_cap').notNull().default(5),
	liveliness: text('liveliness').notNull().default('normal'),
	tone: integer('tone').notNull().default(50),
	pomodoroFocusMin: integer('pomodoro_focus_min').notNull().default(25),
	pomodoroBreakMin: integer('pomodoro_break_min').notNull().default(5),
	pomodoroLongMin: integer('pomodoro_long_min').notNull().default(15),
	soundsOn: boolean('sounds_on').notNull().default(false),
	quietStart: time('quiet_start').notNull().default('22:00'),
	quietEnd: time('quiet_end').notNull().default('08:00'),
	timezone: text('timezone').notNull().default('UTC'),
	/** When the daily shutdown is offered. */
	shutdownTime: time('shutdown_time').notNull().default('21:00'),
	/** When the weekly plan is offered: 0 = Sunday … 6 = Saturday. */
	weeklyPlanDay: integer('weekly_plan_day').notNull().default(0),
	weeklyPlanTime: time('weekly_plan_time').notNull().default('18:00'),
	weatherMode: text('weather_mode').notNull().default('auto'),
	city: text('city'),
	runawayDays: integer('runaway_days').notNull().default(30),
	deathDays: integer('death_days').notNull().default(60),
	timelineChangedAt: at('timeline_changed_at'),
	restUntil: at('rest_until')
});
