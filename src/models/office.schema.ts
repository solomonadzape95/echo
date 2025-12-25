import {pgTable, uuid, varchar, text} from 'drizzle-orm/pg-core'
import { elections } from './election.schema'
import { timestamps } from '../helpers/colums.helpers'

export const offices = pgTable('offices', {
    id: uuid("id").primaryKey().defaultRandom().notNull().unique(),
    name: varchar('name', {length: 255}).notNull(),
    description: text('description').notNull(),
    election: uuid('election').references(() => elections.id).notNull(),
    dependsOn: uuid('depends_on'),
    ...timestamps,
})