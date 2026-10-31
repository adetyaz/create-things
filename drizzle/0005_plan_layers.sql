CREATE TYPE "public"."plan_period_kind" AS ENUM('month', 'week');--> statement-breakpoint
CREATE TABLE "plan_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "plan_period_kind" NOT NULL,
	"starts_on" date NOT NULL,
	"goal_item_ids" uuid[],
	"blocks_wanted" integer,
	"review" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "shutdown_time" time DEFAULT '21:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "weekly_plan_day" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "weekly_plan_time" time DEFAULT '18:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "parked_until" date;--> statement-breakpoint
ALTER TABLE "plan_slots" ADD COLUMN "start_time" time;--> statement-breakpoint
ALTER TABLE "plan_slots" ADD COLUMN "anchor" text;--> statement-breakpoint
ALTER TABLE "plan_slots" ADD COLUMN "place" text;--> statement-breakpoint
ALTER TABLE "plan_slots" ADD COLUMN "missed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "roadmap_steps" ADD COLUMN "recall" text;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_periods_user_kind_start_idx" ON "plan_periods" USING btree ("user_id","kind","starts_on");