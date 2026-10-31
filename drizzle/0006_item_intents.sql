ALTER TABLE "items" ADD COLUMN "intent" text DEFAULT 'make' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "practice_kind" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "intent_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "target_date" date;--> statement-breakpoint
UPDATE "items" SET "intent" = 'learn' WHERE "is_learning_goal" = true;