CREATE TABLE "analytics_guards" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analytics_guards_expiry_idx" ON "analytics_guards" USING btree ("expires_at");