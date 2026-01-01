import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { voters } from './voter.schema'
import { timestamps } from '../helpers/colums.helpers'
import { sql } from 'drizzle-orm'

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  voterId: uuid('voter_id').references(() => voters.id).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at').default(sql`NULL::timestamp`),
  ...timestamps,
})

