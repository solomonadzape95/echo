import { pgTable, uuid, pgEnum } from 'drizzle-orm/pg-core'
import { faculties } from './faculty.schema'
import { timestamps } from '../helpers/colums.helpers'
import { DepartmentEnum } from '../types/faculty.types'

// Create enum with all department names
export const departmentNameEnum = pgEnum('department_name', Object.values(DepartmentEnum) as [string, ...string[]])

export const departments = pgTable('departments', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    name: departmentNameEnum('name').notNull(),
    faculty: uuid('faculty').references(() => faculties.id).notNull(),
    ...timestamps,
})