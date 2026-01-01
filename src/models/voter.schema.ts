import { pgTable, uuid, varchar} from 'drizzle-orm/pg-core'
import { classes } from './class.schema'
import { timestamps } from '../helpers/colums.helpers'

export const voters = pgTable('voters', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    username: varchar('username', {length: 255}).notNull().unique(),
    regNumber: varchar('reg_number', {length: 255}).notNull().unique(),
    class: uuid('class').references(() => classes.id).notNull(),
    password: varchar('password', {length: 255}).notNull(),
    ...timestamps,
})