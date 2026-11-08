CREATE TABLE "busy_times" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"delivered_via" text,
	"acted_at" timestamp with time zone,
	"action" text
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"collection_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_items_collection_id_item_id_pk" PRIMARY KEY("collection_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"source" text DEFAULT 'app' NOT NULL,
	"external_id" text,
	"mode" text DEFAULT 'reference' NOT NULL,
	"goal_item_id" uuid,
	"thread" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sync_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "source_connections" (
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"token_encrypted" text NOT NULL,
	"refresh_encrypted" text,
	"expires_at" timestamp with time zone,
	"scopes" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sync_at" timestamp with time zone,
	CONSTRAINT "source_connections_user_id_source_pk" PRIMARY KEY("user_id","source")
);
--> statement-breakpoint
CREATE TABLE "experiment_assignments" (
	"user_id" text NOT NULL,
	"experiment" text NOT NULL,
	"variant" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experiment_assignments_user_id_experiment_pk" PRIMARY KEY("user_id","experiment")
);
--> statement-breakpoint
CREATE TABLE "product_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "reminders_per_day" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "anchor_times" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "ics_url" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "ics_fetched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "calendar_feed_token" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "templates" text[];--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "rhythm" jsonb;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "hunger_mode" text DEFAULT 'days' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "rhythm" jsonb;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "item_id" uuid;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "step_id" uuid;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "kind" text DEFAULT 'entry' NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "fed" "food_size";--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_goal_item_id_items_id_fk" FOREIGN KEY ("goal_item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "busy_times_user_start_idx" ON "busy_times" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_user_key_idx" ON "reminders" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "reminders_user_due_idx" ON "reminders" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_user_source_external_idx" ON "collections" USING btree ("user_id","source","external_id");--> statement-breakpoint
CREATE INDEX "collections_user_idx" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_events_user_name_idx" ON "product_events" USING btree ("user_id","name");--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_step_id_roadmap_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."roadmap_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "items_user_external_idx" ON "items" USING btree ("user_id","external_source","external_id") WHERE "items"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "journal_entries_user_idx" ON "journal_entries" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_calendar_feed_token_unique" UNIQUE("calendar_feed_token");