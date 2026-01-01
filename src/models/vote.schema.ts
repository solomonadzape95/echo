import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers/colums.helpers'
import { elections } from './election.schema'

export const votes = pgTable('votes', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    prevHash: varchar('prev_hash', {length: 255}).notNull(),
    currentHash: varchar('current_hash', {length: 255}).notNull(),
    voteDataHash: varchar('vote_data_hash', {length: 255}).notNull(), // Hash of ballot data (candidate selection)
    encryptedVoteData: varchar('encrypted_vote_data', {length: 2000}), // Encrypted vote data (ballot/candidate selection) - nullable for backward compatibility
    tokenId: varchar('token_id', {length: 255}).notNull(),
    election: uuid('election').references(() => elections.id).notNull(),
    ...timestamps,
})