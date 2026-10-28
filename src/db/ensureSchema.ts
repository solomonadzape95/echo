import { sql } from 'drizzle-orm'
import { db } from './db'

/**
 * Idempotent schema safety net.
 *
 * Render's pre-deploy step runs `drizzle-kit push`, but a service that was
 * created before a column/table existed can end up serving code that expects
 * it. These statements are safe to run on every boot and ensure the admin
 * operations schema is present before routes start handling requests.
 */
export async function ensureSchema() {
  await db.execute(
    sql`ALTER TABLE "voters" ADD COLUMN IF NOT EXISTS "disabled" boolean NOT NULL DEFAULT false`
  )

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "admin_id" uuid REFERENCES "admins"("id") ON DELETE SET NULL,
      "admin_username" varchar(255),
      "method" varchar(10) NOT NULL,
      "path" varchar(500) NOT NULL,
      "status" integer,
      "ip" varchar(100),
      "user_agent" varchar(500),
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "voter_id" uuid REFERENCES "voters"("id") ON DELETE CASCADE,
      "admin_id" uuid REFERENCES "admins"("id") ON DELETE CASCADE,
      "election_id" uuid REFERENCES "elections"("id") ON DELETE CASCADE,
      "type" varchar(50) NOT NULL,
      "title" varchar(255) NOT NULL,
      "message" text NOT NULL,
      "link" varchar(500),
      "read_at" timestamp,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "notifications_voter_event_unique"
      ON "notifications" ("voter_id", "election_id", "type")
      WHERE "voter_id" IS NOT NULL
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "notifications_voter_created_idx"
      ON "notifications" ("voter_id", "created_at" DESC)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "notifications_admin_created_idx"
      ON "notifications" ("admin_id", "created_at" DESC)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_idx"
      ON "admin_audit_logs" ("created_at" DESC)
  `)

  // Merge duplicate class configurations, then prevent new ones. This is the
  // idempotent equivalent of supabase/migrations/0015_classes_unique.sql for
  // hosted databases whose schema is managed by `drizzle-kit push`.
  await db.execute(sql`
    WITH canonical AS (
      SELECT DISTINCT ON ("level", "faculty", "department")
        "id", "level", "faculty", "department"
      FROM "classes"
      ORDER BY "level", "faculty", "department", "created_at" ASC, "id" ASC
    ), duplicates AS (
      SELECT c."id" AS duplicate_id, k."id" AS canonical_id
      FROM "classes" c
      JOIN canonical k
        ON k."level" = c."level"
       AND k."faculty" = c."faculty"
       AND k."department" = c."department"
      WHERE c."id" <> k."id"
    )
    UPDATE "voters" v
    SET "class" = d."canonical_id"
    FROM duplicates d
    WHERE v."class" = d."duplicate_id"
  `)

  await db.execute(sql`
    WITH canonical AS (
      SELECT DISTINCT ON ("level", "faculty", "department")
        "id", "level", "faculty", "department"
      FROM "classes"
      ORDER BY "level", "faculty", "department", "created_at" ASC, "id" ASC
    ), duplicates AS (
      SELECT c."id" AS duplicate_id, k."id" AS canonical_id
      FROM "classes" c
      JOIN canonical k
        ON k."level" = c."level"
       AND k."faculty" = c."faculty"
       AND k."department" = c."department"
      WHERE c."id" <> k."id"
    )
    UPDATE "masterlist" m
    SET "class" = d."canonical_id"
    FROM duplicates d
    WHERE m."class" = d."duplicate_id"
  `)

  await db.execute(sql`
    WITH canonical AS (
      SELECT DISTINCT ON ("level", "faculty", "department")
        "id", "level", "faculty", "department"
      FROM "classes"
      ORDER BY "level", "faculty", "department", "created_at" ASC, "id" ASC
    )
    DELETE FROM "classes" c
    USING canonical k
    WHERE k."level" = c."level"
      AND k."faculty" = c."faculty"
      AND k."department" = c."department"
      AND c."id" <> k."id"
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "classes_level_faculty_department_unique"
      ON "classes" ("level", "faculty", "department")
  `)
}
