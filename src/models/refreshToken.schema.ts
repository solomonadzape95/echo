import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { voters } from './voter.schema'
import { timestamps } from '../helpers/colums.helpers'
import { sql } from 'drizzle-orm'

export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    voterId: uuid('voter_id').references(() => voters.id).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at').default(sql`NULL::timestamp`),
    ...timestamps,
})

