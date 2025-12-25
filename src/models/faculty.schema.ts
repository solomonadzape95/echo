import {pgTable, uuid, varchar} from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers/colums.helpers'

export const faculties = pgTable('faculties', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    name: varchar('name', {length: 255}).notNull(),
    ...timestamps,
})