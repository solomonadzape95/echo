-- One class per (level, faculty, department).
--
-- The class service checks for duplicates before inserting, but two concurrent
-- requests can both pass that check. The unique index is the real guard.
--
-- Existing duplicates (if any) are merged into the oldest row before the index
-- is created, so voters and masterlist entries keep pointing at a live class.

BEGIN;

WITH canonical AS (
  SELECT DISTINCT ON (level, faculty, department)
    id, level, faculty, department
  FROM classes
  ORDER BY level, faculty, department, created_at ASC, id ASC
), duplicates AS (
  SELECT c.id AS duplicate_id, k.id AS canonical_id
  FROM classes c
  JOIN canonical k
    ON k.level = c.level
   AND k.faculty = c.faculty
   AND k.department = c.department
  WHERE c.id <> k.id
)
UPDATE voters v
SET class = d.canonical_id
FROM duplicates d
WHERE v.class = d.duplicate_id;

WITH canonical AS (
  SELECT DISTINCT ON (level, faculty, department)
    id, level, faculty, department
  FROM classes
  ORDER BY level, faculty, department, created_at ASC, id ASC
), duplicates AS (
  SELECT c.id AS duplicate_id, k.id AS canonical_id
  FROM classes c
  JOIN canonical k
    ON k.level = c.level
   AND k.faculty = c.faculty
   AND k.department = c.department
  WHERE c.id <> k.id
)
UPDATE masterlist m
SET class = d.canonical_id
FROM duplicates d
WHERE m.class = d.duplicate_id;

WITH canonical AS (
  SELECT DISTINCT ON (level, faculty, department)
    id, level, faculty, department
  FROM classes
  ORDER BY level, faculty, department, created_at ASC, id ASC
)
DELETE FROM classes c
USING canonical k
WHERE k.level = c.level
  AND k.faculty = c.faculty
  AND k.department = c.department
  AND c.id <> k.id;

CREATE UNIQUE INDEX IF NOT EXISTS classes_level_faculty_department_unique
  ON classes (level, faculty, department);

COMMIT;
