-- Add slug columns (nullable first, then we'll populate and make NOT NULL)
ALTER TABLE "candidates" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "elections" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "offices" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "voters" ADD COLUMN "profile_picture" varchar(500);--> statement-breakpoint

-- Generate slugs for existing records
-- For elections: use name (replace special chars with hyphens, lowercase, append short id)
UPDATE "elections" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING("id"::text, 1, 8) WHERE "slug" IS NULL;--> statement-breakpoint

-- For offices: use name
UPDATE "offices" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING("id"::text, 1, 8) WHERE "slug" IS NULL;--> statement-breakpoint

-- For candidates: use id (will be regenerated properly on next candidate creation)
UPDATE "candidates" SET "slug" = 'candidate-' || SUBSTRING("id"::text, 1, 8) WHERE "slug" IS NULL;--> statement-breakpoint

-- Make slug columns NOT NULL and add unique constraints
ALTER TABLE "candidates" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "elections" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "offices" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "elections" ADD CONSTRAINT "elections_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "offices" ADD CONSTRAINT "offices_slug_unique" UNIQUE("slug");