CREATE TABLE "course_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"topics" text[],
	"unit_date" date
);
--> statement-breakpoint
ALTER TABLE "course_units" ADD CONSTRAINT "course_units_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_units_item_idx" ON "course_units" USING btree ("item_id","position");