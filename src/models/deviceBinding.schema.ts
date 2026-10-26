import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { voters } from './voter.schema'
import { timestamps } from '../helpers/colums.helpers'

/**
 * One-device-per-account / one-account-per-device lock.
 *
 * The raw device identifier never reaches the database: clients send a stable
 * device id and the service stores `sha256(pepper + deviceId)`. The binding is
 * identity metadata for login only and is never joined to the ballot tables.
 */
export const deviceBindings = pgTable(
  'device_bindings',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    voterId: uuid('voter_id')
      .references(() => voters.id, { onDelete: 'cascade' })
      .notNull(),
    deviceIdHash: varchar('device_id_hash', { length: 64 }).notNull(),
    platform: varchar('platform', { length: 32 }).notNull().default('unknown'),
    label: varchar('label', { length: 160 }),
    boundAt: timestamp('bound_at').notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('device_bindings_voter_id_unique').on(table.voterId),
    uniqueIndex('device_bindings_device_id_hash_unique').on(table.deviceIdHash),
    index('device_bindings_device_id_hash_idx').on(table.deviceIdHash),
  ]
)
