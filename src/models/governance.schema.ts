import { pgTable, uuid, varchar, integer, timestamp, jsonb, text, unique } from 'drizzle-orm/pg-core'
import { admins } from './admin.schema'
import { elections } from './election.schema'

/**
 * Threshold multi-signature governance.
 *
 * Critical election lifecycle transitions (activate, close, publish results)
 * require approval from a quorum of distinct committee members. Each approval is
 * a real Ed25519 signature over the proposal digest, and the action executes only
 * once the threshold of distinct valid signatures is collected.
 *
 * Prototype note: committee private keys are held server-side so the flow is
 * demonstrable without a client key store. Production should keep them on the
 * signer's device (or use a threshold scheme such as FROST).
 */

export const adminKeys = pgTable('admin_keys', {
  adminId: uuid('admin_id')
    .primaryKey()
    .references(() => admins.id)
    .notNull(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const governanceProposals = pgTable('governance_proposals', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  election: uuid('election')
    .references(() => elections.id)
    .notNull(),
  action: varchar('action', { length: 50 }).notNull(), // activate | close | publish_results
  payload: jsonb('payload'),
  digest: varchar('digest', { length: 255 }).notNull(),
  threshold: integer('threshold').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | executed | rejected
  createdBy: uuid('created_by')
    .references(() => admins.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  executedAt: timestamp('executed_at'),
})

export const governanceApprovals = pgTable(
  'governance_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    proposal: uuid('proposal')
      .references(() => governanceProposals.id)
      .notNull(),
    admin: uuid('admin')
      .references(() => admins.id)
      .notNull(),
    signature: text('signature').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniq: unique().on(t.proposal, t.admin),
  })
)
