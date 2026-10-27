import { sql } from 'drizzle-orm'
import { pgTable, uuid, varchar, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { voters } from './voter.schema'
import { admins } from './admin.schema'
import { elections } from './election.schema'

/**
 * In-app notifications. Voter notifications are per-recipient rows so each
 * voter has an independent read state; the unique index on
 * (voter_id, election_id, type) keeps status-broadcast jobs idempotent.
 */
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  voterId: uuid('voter_id').references(() => voters.id, { onDelete: 'cascade' }),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'cascade' }),
  electionId: uuid('election_id').references(() => elections.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  link: varchar('link', { length: 500 }),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  voterEventUnique: uniqueIndex('notifications_voter_event_unique')
    .on(table.voterId, table.electionId, table.type)
    .where(sql`${table.voterId} is not null`),
}))
