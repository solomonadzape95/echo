import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core'
import { elections } from './election.schema'

/**
 * Ledger anchors
 *
 * Stores the signed head (latest link) of each election's vote hash-chain.
 * The head hash is signed with the server's RSA key so that any rewrite of
 * the chain is detectable: an attacker who recomputes the chain cannot forge
 * the head signature without the private key.
 */
export const ledgerAnchors = pgTable('ledger_anchors', {
  election: uuid('election')
    .primaryKey()
    .references(() => elections.id)
    .notNull(),
  headHash: varchar('head_hash', { length: 255 }).notNull(),
  headSignature: varchar('head_signature', { length: 512 }).notNull(),
  voteCount: integer('vote_count').notNull(),
  anchoredAt: timestamp('anchored_at').defaultNow().notNull(),
})
