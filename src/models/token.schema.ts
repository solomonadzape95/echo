import { timestamps } from '../helpers/colums.helpers'
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { elections } from './election.schema'
import { sql } from 'drizzle-orm'

export const tokens = pgTable('tokens', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    election: uuid('election').references(() => elections.id).notNull(),
    tokenHash: varchar('token_hash', {length: 255}).notNull(),
    usedAt: timestamp('used_at').default(sql`NULL::timestamp`),
    ...timestamps,
})
