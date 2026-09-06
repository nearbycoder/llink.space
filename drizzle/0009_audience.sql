CREATE TABLE "email_connections" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"encrypted_key" text NOT NULL,
	"list_id" integer NOT NULL,
	"sync_lease" uuid,
	"lease_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"consent_text" text NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribe_hash" text NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"synced_at" timestamp with time zone,
	"provider_removed_at" timestamp with time zone,
	CONSTRAINT "subscribers_unsubscribe_hash_unique" UNIQUE("unsubscribe_hash")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "signup_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "signup_title" text DEFAULT 'Stay in the loop' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_profile_email_idx" ON "subscribers" USING btree ("profile_id","email");--> statement-breakpoint
CREATE INDEX "subscribers_profile_created_idx" ON "subscribers" USING btree ("profile_id","consent_at");