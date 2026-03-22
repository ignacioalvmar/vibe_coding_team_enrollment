ALTER TABLE "teams" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "vibe" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "accent" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "name_options" jsonb DEFAULT '[]'::jsonb NOT NULL;