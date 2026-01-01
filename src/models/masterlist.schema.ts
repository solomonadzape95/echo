import { pgTable, uuid, varchar, boolean } from 'drizzle-orm/pg-core'
import { classes } from './class.schema'
import { timestamps } from '../helpers/colums.helpers'

export const masterlist = pgTable('masterlist', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: varchar('name', {length: 255}).notNull(),
    regNo: varchar('reg_no', {length: 255}).notNull(),
    class: uuid('class').references(() => classes.id).notNull(),
    activated: boolean('activated').default(false).notNull(),
    ...timestamps,
})

