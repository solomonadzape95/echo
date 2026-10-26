-- Add admin support to refresh_tokens table
-- This allows both voters and admins to use refresh tokens

-- Drop the existing foreign key constraint
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_voter_id_voters_id_fk";

-- Make voter_id nullable
ALTER TABLE "refresh_tokens" ALTER COLUMN "voter_id" DROP NOT NULL;

-- Add admin_id column
ALTER TABLE "refresh_tokens" ADD COLUMN "admin_id" uuid;

-- Add foreign key constraint for admin_id
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;

-- Add check constraint to ensure exactly one of voter_id or admin_id is set
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_check" CHECK (
  (voter_id IS NOT NULL AND admin_id IS NULL) OR 
  (voter_id IS NULL AND admin_id IS NOT NULL)
);

