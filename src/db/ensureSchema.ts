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
}
