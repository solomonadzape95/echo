import { timestamps } from '../helpers/colums.helpers'
import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { elections } from './election.schema'
import { voters } from './voter.schema'

export const issuances = pgTable('issuances', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    election: uuid('election').references(() => elections.id).notNull(),
    voterId: uuid('voter').references(() => voters.id).notNull(),
    tokenHash: varchar('token_hash', {length: 255}), // Link to token for tracking votes
    ...timestamps,
})
