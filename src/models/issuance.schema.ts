import { timestamps } from '../helpers/colums.helpers'
import { pgTable, uniqueIndex, uuid, timestamp } from 'drizzle-orm/pg-core'
import { elections } from './election.schema'
import { voters } from './voter.schema'

/**
 * Issuances
 *
 * Records that a voter was authorised to vote in an election. It deliberately
 * stores NO token and NO vote reference, so the database cannot be used to
 * link a voter identity to a specific ballot.
 *
 *   voter + election  -> did this voter get a token / has this voter voted
 *
 * `votedAt` is set when the voter casts a vote. It is the only double-voting
 * guard that needs identity, and it reveals only "voted in election Y",
 * never "cast ballot Z".
 */
export const issuances = pgTable('issuances', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    election: uuid('election').references(() => elections.id).notNull(),
    voterId: uuid('voter').references(() => voters.id).notNull(),
    votedAt: timestamp('voted_at'),
    ...timestamps,
}, (t) => ({
    // One issuance marker per voter per election. Combined with the
    // FOR UPDATE lock in vote.service, this prevents concurrent double voting.
    electionVoterUnique: uniqueIndex('issuances_election_voter_unique').on(t.election, t.voterId),
}))
