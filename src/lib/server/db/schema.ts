/**
 * Postgres schema (Project Breakdown → Data Model). Postgres is the source of truth;
 * Walrus only gets memory summaries, queued through `memories`.
 *
 * `user_id` columns hold Better Auth user ids. The foreign keys to its `user` table are
 * added with auth (Phase 0 #4), when Better Auth generates its own tables.
 */
import { sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	time,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const userId = () => text('user_id').notNull();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const at = (name: string) => timestamp(name, { withTimezone: true });

// --- enums ---

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

// --- settings ---

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
	weatherMode: text('weather_mode').notNull().default('auto'),
	city: text('city'),
	runawayDays: integer('runaway_days').notNull().default(30),
	deathDays: integer('death_days').notNull().default(60),
	timelineChangedAt: at('timeline_changed_at'),
	restUntil: at('rest_until')
});

// --- capture → choose → start ---

export const items = pgTable(
	'items',
	{
		id: id(),
		userId: userId(),
		title: text('title').notNull(),
		sourceUrl: text('source_url'),
		author: text('author'),
		platform: text('platform'),
		captureType: captureType('capture_type').notNull(),
		imageKey: text('image_key'),
		note: text('note'),
		status: itemStatus('status').notNull().default('inbox'),
		size: itemSize('size'),
		difficulty: difficulty('difficulty'),
		isLearningGoal: boolean('is_learning_goal').notNull().default(false),
		arenaBlockId: text('arena_block_id'),
		savedAt: createdAt(),
		lastActiveAt: at('last_active_at')
	},
	(t) => [
		index('items_user_status_idx').on(t.userId, t.status),
		uniqueIndex('items_user_arena_block_idx')
			.on(t.userId, t.arenaBlockId)
			.where(sql`${t.arenaBlockId} is not null`)
	]
);

export const analyses = pgTable('analyses', {
	id: id(),
	itemId: uuid('item_id')
		.notNull()
		.references(() => items.id, { onDelete: 'cascade' }),
	colors: jsonb('colors'),
	typography: text('typography'),
	layout: text('layout'),
	mood: text('mood').array(),
	style: text('style'),
	components: text('components'),
	forDevelopers: text('for_developers'),
	forCreators: text('for_creators'),
	brief: text('brief'),
	attribution: text('attribution'),
	model: text('model'),
	createdAt: createdAt()
});

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
	startedAt: createdAt(),
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
		startedAt: createdAt(),
		endedAt: at('ended_at'),
		completed: boolean('completed').notNull().default(false),
		note: text('note')
	},
	(t) => [index('pomodoro_sessions_user_idx').on(t.userId, t.startedAt)]
);

// --- remember ---

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

// --- pet ---

export const pets = pgTable(
	'pets',
	{
		id: id(),
		userId: userId(),
		species: text('species').notNull(),
		breed: text('breed').notNull(),
		name: text('name').notNull(),
		sliders: jsonb('sliders').notNull().default({}),
		status: petStatus('status').notNull().default('alive'),
		growth: integer('growth').notNull().default(0),
		lastFedAt: at('last_fed_at').notNull().defaultNow(),
		foodToday: integer('food_today').notNull().default(0),
		foodTodayDate: date('food_today_date'),
		returningDays: integer('returning_days').notNull().default(0),
		bornAt: createdAt(),
		diedAt: at('died_at'),
		memorialItemId: uuid('memorial_item_id'),
		paid: boolean('paid').notNull().default(false)
	},
	(t) => [index('pets_user_idx').on(t.userId)]
);

export const petFeeds = pgTable(
	'pet_feeds',
	{
		id: id(),
		petId: uuid('pet_id')
			.notNull()
			.references(() => pets.id, { onDelete: 'cascade' }),
		sourceType: text('source_type').notNull(),
		sourceId: uuid('source_id').notNull(),
		size: foodSize('size').notNull(),
		createdAt: createdAt()
	},
	// One feed per source, so the same step or session can't feed the pet twice.
	(t) => [uniqueIndex('pet_feeds_source_idx').on(t.petId, t.sourceType, t.sourceId)]
);

export const catalogItems = pgTable('catalog_items', {
	id: id(),
	kind: catalogKind('kind').notNull(),
	name: text('name').notNull(),
	slot: text('slot'),
	speciesOnly: text('species_only'),
	priceCredits: integer('price_credits'),
	earnRule: jsonb('earn_rule'),
	season: text('season'),
	availableFrom: at('available_from'),
	availableTo: at('available_to'),
	createdAt: createdAt()
});

export const userItems = pgTable(
	'user_items',
	{
		userId: userId(),
		catalogItemId: uuid('catalog_item_id')
			.notNull()
			.references(() => catalogItems.id),
		acquiredVia: acquiredVia('acquired_via').notNull(),
		equippedOnPetId: uuid('equipped_on_pet_id').references(() => pets.id, { onDelete: 'set null' }),
		acquiredAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.userId, t.catalogItemId] })]
);

// --- credits + payments ---

/** Append-only. Balance changes are written here and to `credit_balances` in one transaction. */
export const creditLedger = pgTable(
	'credit_ledger',
	{
		id: id(),
		userId: userId(),
		delta: integer('delta').notNull(),
		reason: ledgerReason('reason').notNull(),
		ref: text('ref'),
		createdAt: createdAt()
	},
	(t) => [index('credit_ledger_user_idx').on(t.userId, t.createdAt)]
);

export const creditBalances = pgTable('credit_balances', {
	userId: text('user_id').primaryKey(),
	balance: integer('balance').notNull().default(0),
	updatedAt: createdAt()
});

export const aiUsageDaily = pgTable(
	'ai_usage_daily',
	{
		userId: userId(),
		day: date('day').notNull(),
		freeUsed: integer('free_used').notNull().default(0)
	},
	(t) => [primaryKey({ columns: [t.userId, t.day] })]
);

export const suiPayments = pgTable('sui_payments', {
	id: id(),
	userId: userId(),
	txDigest: text('tx_digest').notNull().unique(),
	/** Raw coin units (USDC has 6 decimals, SUI has 9). */
	amount: bigint('amount', { mode: 'bigint' }).notNull(),
	coin: suiCoin('coin').notNull(),
	purpose: paymentPurpose('purpose').notNull(),
	confirmedAt: at('confirmed_at'),
	createdAt: createdAt()
});

// --- assistant memory + voice ---

/** Local copy of every memory, and the outbox the queue drains into Walrus. */
export const memories = pgTable(
	'memories',
	{
		id: id(),
		userId: userId(),
		type: memoryType('type').notNull(),
		summary: text('summary').notNull(),
		sourceType: text('source_type'),
		sourceId: uuid('source_id'),
		status: memoryStatus('status').notNull().default('queued'),
		attempts: integer('attempts').notNull().default(0),
		lastError: text('last_error'),
		walrusJobId: text('walrus_job_id'),
		createdAt: createdAt(),
		deletedAt: at('deleted_at')
	},
	(t) => [
		index('memories_user_idx').on(t.userId, t.createdAt),
		index('memories_outbox_idx').on(t.status, t.createdAt)
	]
);

export const voiceCaptures = pgTable('voice_captures', {
	id: id(),
	userId: userId(),
	audioKey: text('audio_key'),
	transcript: text('transcript'),
	ideas: jsonb('ideas'),
	createdAt: createdAt()
});

// --- integrations ---

export const arenaConnections = pgTable('arena_connections', {
	userId: text('user_id').primaryKey(),
	tokenEncrypted: text('token_encrypted').notNull(),
	lastSyncAt: at('last_sync_at')
});

export const arenaChannels = pgTable(
	'arena_channels',
	{
		id: id(),
		userId: userId(),
		slug: text('slug').notNull(),
		mode: channelMode('mode').notNull().default('triage')
	},
	(t) => [uniqueIndex('arena_channels_user_slug_idx').on(t.userId, t.slug)]
);

export const exports = pgTable(
	'exports',
	{
		userId: userId(),
		target: exportTarget('target').notNull(),
		tokenEncrypted: text('token_encrypted').notNull(),
		lastRunAt: at('last_run_at')
	},
	(t) => [primaryKey({ columns: [t.userId, t.target] })]
);

// --- notifications ---

export const pushSubscriptions = pgTable('push_subscriptions', {
	id: id(),
	userId: userId(),
	endpoint: text('endpoint').notNull().unique(),
	keys: jsonb('keys').notNull(),
	createdAt: createdAt()
});

export const notifications = pgTable(
	'notifications',
	{
		id: id(),
		userId: userId(),
		kind: text('kind').notNull(),
		channel: notifyChannel('channel').notNull(),
		sentAt: createdAt()
	},
	(t) => [index('notifications_user_idx').on(t.userId, t.sentAt)]
);
