-- Optional one-time registration claim codes.
-- Only the HMAC-SHA256 hash is stored; the plain code is exported once to the
-- electoral committee and never persisted.

ALTER TABLE "masterlist" ADD COLUMN IF NOT EXISTS "registration_code_hash" varchar(255);
