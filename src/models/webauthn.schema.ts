import { pgTable, uuid, text, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core'
import { voters } from './voter.schema'

/**
 * WebAuthn / passkey credentials.
 *
 * This is identity data (account login), kept strictly separate from the voting
 * pipeline. It stores only the public key and credential id — never a biometric
 * template, in line with NIST SP 800-63B.
 */
export const webauthnCredentials = pgTable('webauthn_credentials', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  voterId: uuid('voter_id')
    .references(() => voters.id)
    .notNull(),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(), // base64url
  counter: integer('counter').notNull().default(0),
  transports: text('transports'), // JSON array
  deviceType: varchar('device_type', { length: 50 }),
  backedUp: boolean('backed_up').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
})

/** Short-lived registration/authentication challenges. */
export const webauthnChallenges = pgTable('webauthn_challenges', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  voterId: uuid('voter_id')
    .references(() => voters.id)
    .notNull(),
  challenge: text('challenge').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'registration' | 'authentication'
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
