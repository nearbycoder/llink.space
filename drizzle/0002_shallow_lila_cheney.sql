ALTER TABLE "profiles" ADD COLUMN "page_background_type" text DEFAULT 'gradient' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "page_background_color" text DEFAULT 'sun-cream' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "page_background_gradient" text DEFAULT 'kinetic-neon' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "page_background_image_url" text;