/**
 * How each memory type reaches Walrus (Breakdown §13 "Cost rules"). The whole app shares one Walrus
 * account (500 points an hour), so: `analyze` (10 points, split into facts) only for rich memories,
 * `remember` (5 points, one blob) for one-fact memories, and `digest` for small frequent events,
 * which wait in Postgres and go out once a day as one memory.
 */
import type { MemoryType } from './service';

export type Delivery = 'analyze' | 'remember' | 'digest';

export const DELIVERY: Record<MemoryType, Delivery> = {
	goal: 'analyze',
	learning_goal: 'analyze',
	lesson_learned: 'analyze',
	session_summary: 'analyze',
	voice_ideas: 'analyze',
	plan: 'remember',
	plan_change: 'remember',
	idea_parked: 'remember',
	idea_merged: 'remember',
	stuck_topic: 'remember',
	review_weakness: 'remember',
	work_pattern: 'remember',
	expansion: 'remember',
	pick_feedback: 'digest'
};

/** One day's small events as a single memory: "On 2026-10-31: Started …; Skipped …". */
export function digestSummary(day: string, events: string[]): string {
	return `On ${day}: ${events.map((e) => e.replace(/\.$/, '')).join('; ')}.`.slice(0, 1000);
}
