CREATE TABLE "link_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "section_id" uuid;
--> statement-breakpoint
ALTER TABLE "link_sections" ADD CONSTRAINT "link_sections_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_section_id_link_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."link_sections"("id") ON DELETE set null ON UPDATE no action;
