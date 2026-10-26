-- Fix description column: rename if old column exists, otherwise ensure it exists
DO $$ 
BEGIN
    -- Check if old column with space exists and rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'elections' AND column_name = ' description'
    ) THEN
        ALTER TABLE "elections" RENAME COLUMN " description" TO "description";
    END IF;
    
    -- If description column doesn't exist at all, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'elections' AND column_name = 'description'
    ) THEN
        ALTER TABLE "elections" ADD COLUMN "description" text NOT NULL DEFAULT '';
    END IF;
END $$;