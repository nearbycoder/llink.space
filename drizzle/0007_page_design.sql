ALTER TABLE "profiles" ADD COLUMN "font_family" text DEFAULT 'work' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "button_style" text DEFAULT 'rounded' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "accent_color" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "content_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;