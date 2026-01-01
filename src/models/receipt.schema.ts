import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers/colums.helpers'
import { elections } from './election.schema'

export const receipts = pgTable('receipts', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    receiptCode: varchar('receipt_code', {length: 50}).notNull().unique(), // Short code for receipt
    election: uuid('election').references(() => elections.id).notNull(),
    voteId: uuid('vote').notNull(), // Link receipt to vote (FK reference added via migration)
    ...timestamps,
}) 