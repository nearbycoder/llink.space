ALTER TABLE "links" ADD COLUMN "health_state" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "health_status_code" integer;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "health_final_url" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "health_checked_at" timestamp with time zone;