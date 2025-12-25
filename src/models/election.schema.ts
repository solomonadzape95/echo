import {pgTable, timestamp, uuid, varchar, pgEnum, text} from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers/colums.helpers'

export const electionType = pgEnum('election_type', ['class', 'department', 'faculty'])
export const electionStatus = pgEnum('election_status', ['pending', 'active', 'completed'])

export const elections = pgTable('elections', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    name: varchar('name', {length: 255}).notNull(),
    type: electionType('type').notNull(),
    status: electionStatus('status').default('pending').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    description: text(' description').notNull(),
    domainId: uuid('domain_id').notNull(),
    ...timestamps,
})