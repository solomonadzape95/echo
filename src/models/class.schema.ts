import {pgTable, uuid, varchar, pgEnum} from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers/colums.helpers'
import { FacultyEnum, DepartmentEnum } from '../types/faculty.types'

// Create enums for faculty and department names
export const facultyNameEnum = pgEnum('faculty_name', Object.values(FacultyEnum) as [string, ...string[]])
export const departmentNameEnum = pgEnum('department_name', Object.values(DepartmentEnum) as [string, ...string[]])

export const classes = pgTable('classes', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    level: varchar('level', {length: 255}).notNull(),
    faculty: facultyNameEnum('faculty').notNull(), // Use enum directly instead of foreign key
    department: departmentNameEnum('department').notNull(), // Use enum directly instead of foreign key
    ...timestamps,
})