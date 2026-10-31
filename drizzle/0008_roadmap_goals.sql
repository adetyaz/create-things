ALTER TABLE "roadmap_steps" ADD COLUMN "kind" text DEFAULT 'step' NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD COLUMN "goal_options" jsonb;