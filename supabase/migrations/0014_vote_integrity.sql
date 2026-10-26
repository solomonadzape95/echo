-- Vote-integrity hardening (concurrent double-vote prevention)
--
-- The service checks issuance.voted_at and tokens.used_at before writing a
-- ballot. Those checks are not sufficient under concurrent requests: two
-- transactions can both read the pre-vote state and append two ballots.
--
-- These unique indexes make the database the final arbiter:
--   * one token hash may be consumed once
--   * one nullifier may appear in at most one vote
--   * one voter may have at most one issuance per election
--
-- The vote transaction also takes a row lock on the issuance
-- (SELECT ... FOR UPDATE) before checking voted_at.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM tokens GROUP BY token_hash HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate token_hash rows exist; clean tokens before applying 0014_vote_integrity';
  END IF;

  IF EXISTS (
    SELECT 1 FROM issuances GROUP BY election, voter HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate (election, voter) issuance rows exist; clean issuances before applying 0014_vote_integrity';
  END IF;

  IF EXISTS (
    SELECT 1 FROM votes GROUP BY token_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate votes.token_id rows exist; clean votes before applying 0014_vote_integrity';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS tokens_token_hash_unique
  ON tokens (token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS votes_token_id_unique
  ON votes (token_id);

CREATE UNIQUE INDEX IF NOT EXISTS issuances_election_voter_unique
  ON issuances (election, voter);
