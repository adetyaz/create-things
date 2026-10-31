ALTER TABLE "plan_periods" ALTER COLUMN "kind" SET DATA TYPE text USING "kind"::text;--> statement-breakpoint
ALTER TABLE "plan_periods" ADD COLUMN "themes" text[];--> statement-breakpoint
ALTER TABLE "plan_periods" ADD COLUMN "intention" text;--> statement-breakpoint
DROP TYPE "public"."plan_period_kind";