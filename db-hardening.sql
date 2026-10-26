-- Ledger hardening schema changes
--
-- These are the database changes required by the hardened vote ledger.
-- They are also represented in the Drizzle models (votes.signature and
-- ledger_anchors), so `bun run db:push` will create them on a fresh DB.
-- Run this file directly if you need to apply them without db:push:
--
--   psql -d echo_voting -f db-hardening.sql

-- Per-vote RSA signature over current_hash (tamper-evidence)
ALTER TABLE votes ADD COLUMN IF NOT EXISTS signature varchar(512);

-- Signed head of each election's vote hash-chain (tamper-evidence anchor)
CREATE TABLE IF NOT EXISTS ledger_anchors (
  election uuid PRIMARY KEY REFERENCES elections(id),
  head_hash varchar(255) NOT NULL,
  head_signature varchar(512) NOT NULL,
  vote_count integer NOT NULL,
  anchored_at timestamp NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Anonymity: remove the voter -> token link from issuances.
--
-- `token_hash` mapped a voter to their token (and therefore, via votes.token_id,
-- to their ballot). It is removed. `voted_at` replaces it: it records only that
-- the voter voted in an election, never which token or ballot was theirs.
-- ---------------------------------------------------------------------------
ALTER TABLE issuances DROP COLUMN IF EXISTS token_hash;
ALTER TABLE issuances ADD COLUMN IF NOT EXISTS voted_at timestamp;

-- ---------------------------------------------------------------------------
-- Registration Authority key material (RFC 9474, RSABSSA-SHA384-PSS-Randomized).
-- The private key signs blinded payloads only; it can never link a token.
-- Production note: move the private key to an HSM/KMS.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ra_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text NOT NULL,
  private_key text NOT NULL,
  variant varchar(100) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  retired_at timestamp
);

-- ---------------------------------------------------------------------------
-- Device lock: one account per device and one device per account.
--
-- The client sends a stable device identifier; only its salted SHA-256 hash is
-- stored here. This table is identity metadata for login and is never joined to
-- the anonymous ballot tables.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  device_id_hash varchar(64) NOT NULL,
  platform varchar(32) NOT NULL DEFAULT 'unknown',
  label varchar(160),
  bound_at timestamp NOT NULL DEFAULT now(),
  last_seen_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS device_bindings_voter_id_unique
  ON device_bindings (voter_id);
CREATE UNIQUE INDEX IF NOT EXISTS device_bindings_device_id_hash_unique
  ON device_bindings (device_id_hash);
CREATE INDEX IF NOT EXISTS device_bindings_device_id_hash_idx
  ON device_bindings (device_id_hash);

-- ---------------------------------------------------------------------------
-- Optional one-time registration claim codes.
--
-- When an entry has a code hash, knowing the registration number is not enough
-- to register: the student must also present the code distributed by the
-- electoral committee. Codes are stored as HMAC-SHA256 hashes.
-- ---------------------------------------------------------------------------
ALTER TABLE masterlist ADD COLUMN IF NOT EXISTS registration_code_hash varchar(255);

-- ---------------------------------------------------------------------------
-- Vote-integrity indexes (concurrent double-vote prevention)
--
-- The vote transaction locks the issuance row with SELECT ... FOR UPDATE and
-- then checks voted_at. These indexes close the remaining races:
--   * a token hash is consumed once
--   * a nullifier appears in at most one ballot
--   * a voter has at most one issuance per election
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS tokens_token_hash_unique
  ON tokens (token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS votes_token_id_unique
  ON votes (token_id);
CREATE UNIQUE INDEX IF NOT EXISTS issuances_election_voter_unique
  ON issuances (election, voter);
