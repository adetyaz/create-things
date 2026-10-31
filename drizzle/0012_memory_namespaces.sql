ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "memory_namespace_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "embedding" jsonb;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "embedding_key" text;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN IF NOT EXISTS "namespace" text;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN IF NOT EXISTS "blob_ids" text[];--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN IF NOT EXISTS "delivery" text DEFAULT 'analyze' NOT NULL;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN IF NOT EXISTS "digest_id" uuid;