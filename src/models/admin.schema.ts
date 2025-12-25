import { pgTable, uuid, varchar, pgEnum } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers/colums.helpers'

// Admin role enum
export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'admin', 'moderator'])

export const admins = pgTable('admins', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    username: varchar('username', {length: 255}).notNull().unique(),
    email: varchar('email', {length: 255}).notNull().unique(),
    password: varchar('password', {length: 255}).notNull(), // Hashed password
    role: adminRoleEnum('role').default('admin').notNull(),
    fullName: varchar('full_name', {length: 255}),
    ...timestamps,
})

