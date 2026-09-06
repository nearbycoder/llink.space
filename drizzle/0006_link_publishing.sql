ALTER TABLE "links" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "feature_image_url" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "cta_label" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "expire_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "links_one_featured_idx" ON "links" USING btree ("profile_id") WHERE "links"."featured" = true;