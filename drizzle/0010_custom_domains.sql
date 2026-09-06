CREATE TABLE "custom_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"provider_id" text,
	"provider_managed" boolean DEFAULT false NOT NULL,
	"provider_status" jsonb,
	"lease_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_domains_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domains_verified_host_idx" ON "custom_domains" USING btree ("hostname") WHERE "custom_domains"."verified_at" is not null;--> statement-breakpoint
CREATE INDEX "custom_domains_host_idx" ON "custom_domains" USING btree ("hostname");