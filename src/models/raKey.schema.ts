import { pgTable, uuid, text, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'

/**
 * Registration Authority key material.
 *
 * The RA key pair is the trust anchor for token issuance. The private key signs
 * blinded payloads only (RFC 9474); it can never see or link a token.
 *
 * Prototype note: the private key is stored here for persistence and key
 * rotation. In production it should live in an HSM/KMS and never in the
 * application database. See TASKS.md (hardening).
 */
export const raKeys = pgTable('ra_keys', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  publicKey: text('public_key').notNull(), // base64url SPKI
  privateKey: text('private_key').notNull(), // base64url PKCS#8
  variant: varchar('variant', { length: 100 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  retiredAt: timestamp('retired_at'),
})
