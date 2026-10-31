/** Postgres enums shared across the schema. */
import { pgEnum } from 'drizzle-orm/pg-core';

export const itemStatus = pgEnum('item_status', [
	'inbox',
	'ready',
	'shortlist',
	'focus',
	'paused',
	'done',
	'archived'
]);
export const captureType = pgEnum('capture_type', ['screenshot', 'url', 'upload', 'note', 'voice']);
export const itemSize = pgEnum('item_size', ['afternoon', 'weekend', 'week', 'month']);
export const difficulty = pgEnum('difficulty', ['easy', 'medium', 'hard']);
export const roadmapStyle = pgEnum('roadmap_style', ['project', 'skill']);
export const progress = pgEnum('progress', ['not_started', 'in_progress', 'complete']);
export const projectStatus = pgEnum('project_status', ['ideating', 'in_progress', 'done']);
export const journalSource = pgEnum('journal_source', ['manual', 'pomodoro', 'check_in', 'voice']);
export const cardSource = pgEnum('card_source', [
	'roadmap_step',
	'journal',
	'pomodoro',
	'lesson',
	'manual'
]);
export const cardType = pgEnum('card_type', ['qa', 'explain']);
export const rating = pgEnum('rating', ['got_it', 'shaky', 'forgot']);
export const petStatus = pgEnum('pet_status', ['alive', 'ran_away', 'dead']);
export const foodSize = pgEnum('food_size', ['snack', 'meal', 'feast']);
export const catalogKind = pgEnum('catalog_kind', [
	'accessory',
	'decor',
	'toy',
	'sound_pack',
	'pet',
	'fur'
]);
export const acquiredVia = pgEnum('acquired_via', ['earned', 'bought']);
export const ledgerReason = pgEnum('ledger_reason', ['purchase', 'spend', 'refund', 'grant']);
export const channelMode = pgEnum('channel_mode', ['triage', 'curated']);
export const exportTarget = pgEnum('export_target', ['notion']);
export const memoryType = pgEnum('memory_type', [
	'goal',
	'learning_goal',
	'plan',
	'plan_change',
	'idea_parked',
	'idea_merged',
	'session_summary',
	'stuck_topic',
	'lesson_learned',
	'review_weakness',
	'pick_feedback',
	'work_pattern',
	'expansion',
	'voice_ideas'
]);
export const memoryStatus = pgEnum('memory_status', ['queued', 'sent', 'failed']);
export const suiCoin = pgEnum('sui_coin', ['usdc', 'sui']);
export const paymentPurpose = pgEnum('payment_purpose', ['credits', 'request']);
export const notifyChannel = pgEnum('notify_channel', ['badge', 'email', 'push']);
