ALTER TABLE "items" RENAME COLUMN "created_at" TO "saved_at";--> statement-breakpoint
ALTER TABLE "projects" RENAME COLUMN "created_at" TO "started_at";--> statement-breakpoint
ALTER TABLE "pomodoro_sessions" RENAME COLUMN "created_at" TO "started_at";--> statement-breakpoint
ALTER TABLE "pets" RENAME COLUMN "created_at" TO "born_at";--> statement-breakpoint
ALTER TABLE "user_items" RENAME COLUMN "created_at" TO "acquired_at";--> statement-breakpoint
ALTER TABLE "credit_balances" RENAME COLUMN "created_at" TO "updated_at";--> statement-breakpoint
ALTER TABLE "notifications" RENAME COLUMN "created_at" TO "sent_at";
