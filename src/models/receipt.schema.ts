import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers/colums.helpers'
import { elections } from './election.schema'

export const receipts = pgTable('receipts', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    receiptHash: varchar('receipt_hash', {length: 255}).notNull(),
    election: uuid('election').references(() => elections.id).notNull(),
    ...timestamps,
}) 