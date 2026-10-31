ALTER TABLE "items" ADD COLUMN "title_from_user" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "analysis_error" text;