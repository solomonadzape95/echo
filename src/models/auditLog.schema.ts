import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core'
import { admins } from './admin.schema'

/**
 * Durable audit trail for mutating admin requests.
 *
 * Request bodies are deliberately not stored (they can contain passwords,
 * tokens or personal data). The method, path, status, actor and client address
 * are enough to reconstruct who did what and when.
 */
export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  adminUsername: varchar('admin_username', { length: 255 }),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  status: integer('status'),
  ip: varchar('ip', { length: 100 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
