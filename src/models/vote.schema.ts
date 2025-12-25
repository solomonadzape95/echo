import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers/colums.helpers'
import { elections } from './election.schema'

export const votes = pgTable('votes', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    prevHash: varchar('prev_hash', {length: 255}).notNull(),
    currentHash: varchar('current_hash', {length: 255}).notNull(),
    tokenId: varchar('token_id', {length: 255}).notNull(),
    election: uuid('election').references(() => elections.id).notNull(),
    ...timestamps,
})