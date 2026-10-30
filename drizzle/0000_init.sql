CREATE TYPE "public"."acquired_via" AS ENUM('earned', 'bought');--> statement-breakpoint
CREATE TYPE "public"."capture_type" AS ENUM('screenshot', 'url', 'upload', 'note', 'voice');--> statement-breakpoint
CREATE TYPE "public"."card_source" AS ENUM('roadmap_step', 'journal', 'pomodoro', 'lesson', 'manual');--> statement-breakpoint
CREATE TYPE "public"."card_type" AS ENUM('qa', 'explain');--> statement-breakpoint
CREATE TYPE "public"."catalog_kind" AS ENUM('accessory', 'decor', 'toy', 'sound_pack', 'pet', 'fur');--> statement-breakpoint
CREATE TYPE "public"."channel_mode" AS ENUM('triage', 'curated');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."export_target" AS ENUM('notion');--> statement-breakpoint
CREATE TYPE "public"."food_size" AS ENUM('snack', 'meal', 'feast');--> statement-breakpoint
CREATE TYPE "public"."item_size" AS ENUM('afternoon', 'weekend', 'week', 'month');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('inbox', 'ready', 'shortlist', 'focus', 'paused', 'done', 'archived');--> statement-breakpoint
CREATE TYPE "public"."journal_source" AS ENUM('manual', 'pomodoro', 'check_in', 'voice');--> statement-breakpoint
CREATE TYPE "public"."ledger_reason" AS ENUM('purchase', 'spend', 'refund', 'grant');--> statement-breakpoint
CREATE TYPE "public"."memory_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."memory_type" AS ENUM('goal', 'learning_goal', 'plan', 'plan_change', 'idea_parked', 'idea_merged', 'session_summary', 'stuck_topic', 'lesson_learned', 'review_weakness', 'pick_feedback', 'work_pattern', 'expansion', 'voice_ideas');--> statement-breakpoint
CREATE TYPE "public"."notify_channel" AS ENUM('badge', 'email', 'push');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('credits', 'request');--> statement-breakpoint
CREATE TYPE "public"."pet_status" AS ENUM('alive', 'ran_away', 'dead');--> statement-breakpoint
CREATE TYPE "public"."progress" AS ENUM('not_started', 'in_progress', 'complete');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('ideating', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('got_it', 'shaky', 'forgot');--> statement-breakpoint
CREATE TYPE "public"."roadmap_style" AS ENUM('project', 'skill');--> statement-breakpoint
CREATE TYPE "public"."sui_coin" AS ENUM('usdc', 'sui');--> statement-breakpoint
CREATE TABLE "ai_usage_daily" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"free_used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_usage_daily_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"colors" jsonb,
	"typography" text,
	"layout" text,
	"mood" text[],
	"style" text,
	"components" text,
	"for_developers" text,
	"for_creators" text,
	"brief" text,
	"attribution" text,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arena_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"mode" "channel_mode" DEFAULT 'triage' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arena_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"token_encrypted" text NOT NULL,
	"last_sync_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "catalog_kind" NOT NULL,
	"name" text NOT NULL,
	"slot" text,
	"species_only" text,
	"price_credits" integer,
	"earn_rule" jsonb,
	"season" text,
	"available_from" timestamp with time zone,
	"available_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_balances" (
	"user_id" text PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" "ledger_reason" NOT NULL,
	"ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"user_id" text NOT NULL,
	"target" "export_target" NOT NULL,
	"token_encrypted" text NOT NULL,
	"last_run_at" timestamp with time zone,
	CONSTRAINT "exports_user_id_target_pk" PRIMARY KEY("user_id","target")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"source_url" text,
	"author" text,
	"platform" text,
	"capture_type" "capture_type" NOT NULL,
	"image_key" text,
	"note" text,
	"status" "item_status" DEFAULT 'inbox' NOT NULL,
	"size" "item_size",
	"difficulty" "difficulty",
	"is_learning_goal" boolean DEFAULT false NOT NULL,
	"arena_block_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"body" text NOT NULL,
	"source" "journal_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"item_id" uuid,
	"source_type" "card_source" NOT NULL,
	"source_id" uuid,
	"type" "card_type" NOT NULL,
	"prompt" text NOT NULL,
	"answer" text NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"next_review_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_rating" "rating",
	"review_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "memory_type" NOT NULL,
	"summary" text NOT NULL,
	"source_type" text,
	"source_id" uuid,
	"status" "memory_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"walrus_job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"channel" "notify_channel" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pet_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"size" "food_size" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"species" text NOT NULL,
	"breed" text NOT NULL,
	"name" text NOT NULL,
	"sliders" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "pet_status" DEFAULT 'alive' NOT NULL,
	"growth" integer DEFAULT 0 NOT NULL,
	"last_fed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"food_today" integer DEFAULT 0 NOT NULL,
	"food_today_date" date,
	"returning_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"died_at" timestamp with time zone,
	"memorial_item_id" uuid,
	"paid" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"step_id" uuid NOT NULL,
	"day" date NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pomodoro_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"step_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"completed" boolean DEFAULT false NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "project_status" DEFAULT 'ideating' NOT NULL,
	"content" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "roadmap_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"milestone" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"minutes" integer NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"style" "roadmap_style" NOT NULL,
	"skills" jsonb,
	"resources" jsonb,
	"progress" "progress" DEFAULT 'not_started' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sui_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tx_digest" text NOT NULL,
	"amount" bigint NOT NULL,
	"coin" "sui_coin" NOT NULL,
	"purpose" "payment_purpose" NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sui_payments_tx_digest_unique" UNIQUE("tx_digest")
);
--> statement-breakpoint
CREATE TABLE "user_items" (
	"user_id" text NOT NULL,
	"catalog_item_id" uuid NOT NULL,
	"acquired_via" "acquired_via" NOT NULL,
	"equipped_on_pet_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_items_user_id_catalog_item_id_pk" PRIMARY KEY("user_id","catalog_item_id")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"focus_limit" integer DEFAULT 1 NOT NULL,
	"daily_review_cap" integer DEFAULT 5 NOT NULL,
	"liveliness" text DEFAULT 'normal' NOT NULL,
	"tone" integer DEFAULT 50 NOT NULL,
	"pomodoro_focus_min" integer DEFAULT 25 NOT NULL,
	"pomodoro_break_min" integer DEFAULT 5 NOT NULL,
	"pomodoro_long_min" integer DEFAULT 15 NOT NULL,
	"sounds_on" boolean DEFAULT false NOT NULL,
	"quiet_start" time DEFAULT '22:00' NOT NULL,
	"quiet_end" time DEFAULT '08:00' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"weather_mode" text DEFAULT 'auto' NOT NULL,
	"city" text,
	"runaway_days" integer DEFAULT 30 NOT NULL,
	"death_days" integer DEFAULT 60 NOT NULL,
	"timeline_changed_at" timestamp with time zone,
	"rest_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "voice_captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"audio_key" text,
	"transcript" text,
	"ideas" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_cards" ADD CONSTRAINT "knowledge_cards_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_feeds" ADD CONSTRAINT "pet_feeds_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_slots" ADD CONSTRAINT "plan_slots_step_id_roadmap_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."roadmap_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_step_id_roadmap_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."roadmap_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ADD CONSTRAINT "roadmap_steps_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_equipped_on_pet_id_pets_id_fk" FOREIGN KEY ("equipped_on_pet_id") REFERENCES "public"."pets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "arena_channels_user_slug_idx" ON "arena_channels" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_idx" ON "credit_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "items_user_status_idx" ON "items" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "items_user_arena_block_idx" ON "items" USING btree ("user_id","arena_block_id") WHERE "items"."arena_block_id" is not null;--> statement-breakpoint
CREATE INDEX "journal_entries_project_idx" ON "journal_entries" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "knowledge_cards_due_idx" ON "knowledge_cards" USING btree ("user_id","next_review_at");--> statement-breakpoint
CREATE INDEX "memories_user_idx" ON "memories" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "memories_outbox_idx" ON "memories" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pet_feeds_source_idx" ON "pet_feeds" USING btree ("pet_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "pets_user_idx" ON "pets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_slots_step_idx" ON "plan_slots" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "plan_slots_user_day_idx" ON "plan_slots" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "pomodoro_sessions_user_idx" ON "pomodoro_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "roadmap_steps_roadmap_idx" ON "roadmap_steps" USING btree ("roadmap_id","position");