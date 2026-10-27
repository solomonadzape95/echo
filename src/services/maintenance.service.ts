import { sql } from 'drizzle-orm'
import { db } from '../db/db'

export type ResetScope = 'voting' | 'voters' | 'masterlist' | 'elections' | 'classes'

export interface ResetSummary {
  voters: number
  masterlist: number
  classes: number
  elections: number
  offices: number
  candidates: number
  votes: number
  tokens: number
  issuances: number
  receipts: number
  admins: number
}

export interface ResetResult {
  deleted: Record<string, number>
  totalDeleted: number
  scopes: ResetScope[]
  preserved: string[]
}

const DELETE_ORDER = [
  'governance_approvals',
  'governance_proposals',
  'results',
  'candidates',
  'offices',
  'votes',
  'receipts',
  'tokens',
  'issuances',
  'ledger_anchors',
  'device_bindings',
  'voter_refresh_tokens',
  'password_reset_tokens',
  'webauthn_challenges',
  'webauthn_credentials',
  'voters',
  'masterlist',
  'elections',
  'classes',
] as const

type DeleteStep = (typeof DELETE_ORDER)[number]

function statementFor(step: DeleteStep): string {
  switch (step) {
    case 'voter_refresh_tokens':
      // Keep admin sessions alive while clearing every voter session.
      return 'DELETE FROM "refresh_tokens" WHERE "voter_id" IS NOT NULL'
    default:
      return `DELETE FROM "${step}"`
  }
}

export class MaintenanceService {
  async getSummary(): Promise<ResetSummary> {
    const result = await db.execute(sql`
      SELECT
        (SELECT count(*) FROM "voters")::int AS voters,
        (SELECT count(*) FROM "masterlist")::int AS masterlist,
        (SELECT count(*) FROM "classes")::int AS classes,
        (SELECT count(*) FROM "elections")::int AS elections,
        (SELECT count(*) FROM "offices")::int AS offices,
        (SELECT count(*) FROM "candidates")::int AS candidates,
        (SELECT count(*) FROM "votes")::int AS votes,
        (SELECT count(*) FROM "tokens")::int AS tokens,
        (SELECT count(*) FROM "issuances")::int AS issuances,
        (SELECT count(*) FROM "receipts")::int AS receipts,
        (SELECT count(*) FROM "admins")::int AS admins
    `)

    const row = (result as any).rows?.[0] as Partial<ResetSummary> | undefined

    return {
      voters: Number(row?.voters ?? 0),
      masterlist: Number(row?.masterlist ?? 0),
      classes: Number(row?.classes ?? 0),
      elections: Number(row?.elections ?? 0),
      offices: Number(row?.offices ?? 0),
      candidates: Number(row?.candidates ?? 0),
      votes: Number(row?.votes ?? 0),
      tokens: Number(row?.tokens ?? 0),
      issuances: Number(row?.issuances ?? 0),
      receipts: Number(row?.receipts ?? 0),
      admins: Number(row?.admins ?? 0),
    }
  }

  /**
   * Delete operational data.
   *
   * Dependencies are expanded so a partial selection never leaves orphans:
   * - voters implies voting (issuances are voter-linked) and candidates
   * - elections implies voting, offices and candidates
   * - classes implies voters, masterlist and elections
   *
   * Admin accounts and admin sessions are always preserved.
   */
  async reset(scopes: ResetScope[]): Promise<ResetResult> {
    const all = scopes.includes('classes')
    const resetElections = all || scopes.includes('elections')
    const resetVoters = all || scopes.includes('voters')
    const resetMasterlist = all || scopes.includes('masterlist')
    const resetClasses = all
    const resetVoting = all || resetElections || resetVoters || scopes.includes('voting')

    const steps = new Set<DeleteStep>()

    if (resetElections) {
      steps.add('governance_approvals')
      steps.add('governance_proposals')
    }
    if (resetVoting) {
      steps.add('results')
      steps.add('votes')
      steps.add('receipts')
      steps.add('tokens')
      steps.add('issuances')
      steps.add('ledger_anchors')
    }
    if (resetElections || resetVoters) {
      // candidates reference voters and offices, and results reference candidates.
      steps.add('results')
      steps.add('candidates')
    }
    if (resetElections) {
      steps.add('offices')
    }
    if (resetVoters) {
      steps.add('device_bindings')
      steps.add('voter_refresh_tokens')
      steps.add('password_reset_tokens')
      steps.add('webauthn_challenges')
      steps.add('webauthn_credentials')
      steps.add('voters')
    }
    if (resetMasterlist) {
      steps.add('masterlist')
    }
    if (resetElections) {
      steps.add('elections')
    }
    if (resetClasses) {
      steps.add('classes')
    }

    const deleted: Record<string, number> = {}

    await db.transaction(async (tx) => {
      for (const step of DELETE_ORDER) {
        if (!steps.has(step)) continue

        const result = await tx.execute(sql.raw(statementFor(step)))
        deleted[step] = Number((result as any).rowCount ?? 0)
      }
    })

    const totalDeleted = Object.values(deleted).reduce((sum, count) => sum + count, 0)

    return {
      deleted,
      totalDeleted,
      scopes,
      preserved: ['admins', 'admin_keys', 'admin_sessions'],
    }
  }
}

export const maintenanceService = new MaintenanceService()
