import { timestamps } from '../helpers/colums.helpers'
import { pgTable, uniqueIndex, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { elections } from './election.schema'
import { sql } from 'drizzle-orm'

export const tokens = pgTable('tokens', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    election: uuid('election').references(() => elections.id).notNull(),
    tokenHash: varchar('token_hash', {length: 255}).notNull(),
    usedAt: timestamp('used_at').default(sql`NULL::timestamp`),
    ...timestamps,
}, (t) => ({
    // Database-level single-use guarantee. The service also checks usedAt, but
    // the unique index closes the concurrent check-then-insert race.
    tokenHashUnique: uniqueIndex('tokens_token_hash_unique').on(t.tokenHash),
}))
