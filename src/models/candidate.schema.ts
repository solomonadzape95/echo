import { pgTable, uuid, varchar, text } from 'drizzle-orm/pg-core'
import { offices } from './office.schema'
import { voters } from './voter.schema'
import { timestamps } from '../helpers/colums.helpers'

export const candidates = pgTable('candidates', {
    id: uuid('id').primaryKey().defaultRandom().notNull().unique(),
    office: uuid('office').references(() => offices.id).notNull(),
    voterId: uuid('voter').references(() => voters.id).notNull(),
    quote: text('quote').default(""),
    manifesto: text('manifesto').default(""),
    image: varchar('image', {length: 255}).default(""),
    ...timestamps,
})