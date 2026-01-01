import { pgTable, uuid, varchar, integer, decimal, timestamp } from 'drizzle-orm/pg-core'
import { elections } from './election.schema'
import { offices } from './office.schema'
import { candidates } from './candidate.schema'
import { admins } from './admin.schema'
import { timestamps } from '../helpers/colums.helpers'

/**
 * Election Results Table
 * 
 * Stores calculated vote counts per candidate per office for each election.
 * Results are calculated once by an admin and stored for fast retrieval.
 * 
 * Structure:
 * - One row per candidate per office per election
 * - voteCount: number of votes for this candidate
 * - percentage: percentage of total votes for this office
 * - calculatedAt: when results were calculated
 * - calculatedBy: which admin calculated the results
 */
export const results = pgTable('results', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  election: uuid('election').references(() => elections.id).notNull(),
  office: uuid('office').references(() => offices.id).notNull(),
  candidate: uuid('candidate').references(() => candidates.id).notNull(),
  voteCount: integer('vote_count').notNull().default(0),
  percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull().default('0.00'), // e.g., 60.50 for 60.50%
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  calculatedBy: uuid('calculated_by').references(() => admins.id), // Admin who calculated results
  ...timestamps,
})

