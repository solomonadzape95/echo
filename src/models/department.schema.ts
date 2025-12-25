import {pgTable, uuid, varchar} from 'drizzle-orm/pg-core'
import { faculties } from './faculty.schema'
import { timestamps } from '../helpers/colums.helpers'

export const departments = pgTable('departments', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    name: varchar('name', {length: 255}).notNull(),
    faculty: uuid('faculty').references(() => faculties.id).notNull(),
    ...timestamps,
})