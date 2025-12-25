import { pgTable, uuid, pgEnum } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers/colums.helpers'
import { FacultyEnum } from '../types/faculty.types'

// Create enum with all faculty names
export const facultyNameEnum = pgEnum('faculty_name', Object.values(FacultyEnum) as [string, ...string[]])

export const faculties = pgTable('faculties', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    name: facultyNameEnum('name').notNull(),
    ...timestamps,
})