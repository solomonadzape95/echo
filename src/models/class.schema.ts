import {pgTable, uuid, varchar} from 'drizzle-orm/pg-core'
import { faculties } from './faculty.schema'
import { departments } from './department.schema'
import { timestamps } from '../helpers/colums.helpers'

export const classes = pgTable('classes', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    level: varchar('level', {length: 255}).notNull(),
    faculty: uuid('faculty').references(() => faculties.id).notNull(),
    department: uuid('department').references(() => departments.id).notNull(),
    ...timestamps,
})