-- Drop redundant unique constraints on PRIMARY KEY fields
-- PRIMARY KEY already implies UNIQUE, so these constraints are redundant

ALTER TABLE elections DROP CONSTRAINT IF EXISTS elections_id_unique;
ALTER TABLE offices DROP CONSTRAINT IF EXISTS offices_id_unique;
ALTER TABLE voters DROP CONSTRAINT IF EXISTS voters_id_unique;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_id_unique;
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_id_unique;
ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_id_unique;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_id_unique;
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_id_unique;
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_id_unique;
ALTER TABLE faculties DROP CONSTRAINT IF EXISTS faculties_id_unique;
ALTER TABLE issuances DROP CONSTRAINT IF EXISTS issuances_id_unique;
ALTER TABLE masterlist DROP CONSTRAINT IF EXISTS masterlist_id_unique;
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_id_unique;
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_id_unique;
ALTER TABLE results DROP CONSTRAINT IF EXISTS results_id_unique;
