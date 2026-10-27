import crypto from 'crypto'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../db/db'
import { admins } from '../models/admin.schema'
import { elections } from '../models/election.schema'
import {
  adminKeys,
  governanceApprovals,
  governanceProposals,
} from '../models/governance.schema'
import { resultService } from './result.service'

/**
 * Threshold multi-signature governance.
 *
 * A critical election action (activate, close, publish results) is proposed and
 * signed by one committee member, then approved and signed by others. The action
 * executes only once `threshold` **distinct** valid Ed25519 signatures over the
 * proposal digest have been collected.
 *
 * This mirrors the multi-sig governance in the report: no single administrator
 * can drive a critical state transition.
 */

export type GovernanceAction = 'activate' | 'close' | 'publish_results'

const DEFAULT_THRESHOLD = Number(process.env.GOVERNANCE_THRESHOLD || 2)

export class GovernanceService {
  threshold(): number {
    return DEFAULT_THRESHOLD
  }

  // -------------------------------------------------------------------------
  // Committee keys (Ed25519)
  // -------------------------------------------------------------------------

  private async ensureAdminKey(adminId: string) {
    const [existing] = await db.select().from(adminKeys).where(eq(adminKeys.adminId, adminId)).limit(1)
    if (existing) return existing

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    const [created] = await db
      .insert(adminKeys)
      .values({ adminId, publicKey, privateKey })
      .returning()

    return created!
  }

  private sign(digest: string, privateKeyPem: string): string {
    return crypto.sign(null, Buffer.from(digest, 'utf8'), privateKeyPem).toString('base64url')
  }

  private verify(digest: string, signature: string, publicKeyPem: string): boolean {
    try {
      return crypto.verify(
        null,
        Buffer.from(digest, 'utf8'),
        publicKeyPem,
        Buffer.from(signature, 'base64url')
      )
    } catch {
      return false
    }
  }

  private computeDigest(electionId: string, action: string, payload: unknown): string {
    const nonce = crypto.randomBytes(16).toString('hex')
    return crypto
      .createHash('sha256')
      .update(`${electionId}|${action}|${JSON.stringify(payload ?? {})}|${nonce}`)
      .digest('hex')
  }

  // -------------------------------------------------------------------------
  // Proposals
  // -------------------------------------------------------------------------

  /** Create a proposal. The proposer's signature counts as the first approval. */
  async createProposal(
    adminId: string,
    input: { electionId: string; action: GovernanceAction; payload?: Record<string, unknown> }
  ) {
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, input.electionId))
      .limit(1)
    if (!election) throw new Error('Election not found')

    const key = await this.ensureAdminKey(adminId)
    const digest = this.computeDigest(input.electionId, input.action, input.payload)
    const threshold = this.threshold()

    const [proposal] = await db
      .insert(governanceProposals)
      .values({
        election: input.electionId,
        action: input.action,
        payload: (input.payload ?? {}) as any,
        digest,
        threshold,
        status: 'pending',
        createdBy: adminId,
      })
      .returning()

    if (!proposal) throw new Error('Failed to create proposal')

    await db.insert(governanceApprovals).values({
      proposal: proposal.id,
      admin: adminId,
      signature: this.sign(digest, key.privateKey),
    })

    // A threshold of 1 executes immediately.
    await this.maybeExecute(proposal.id)

    return this.getProposal(proposal.id)
  }

  /** Approve a pending proposal. Executes it when the threshold is reached. */
  async approve(adminId: string, proposalId: string) {
    const [proposal] = await db
      .select()
      .from(governanceProposals)
      .where(eq(governanceProposals.id, proposalId))
      .limit(1)

    if (!proposal) throw new Error('Proposal not found')
    if (proposal.status !== 'pending') throw new Error(`Proposal is already ${proposal.status}`)

    const key = await this.ensureAdminKey(adminId)

    const [existing] = await db
      .select()
      .from(governanceApprovals)
      .where(
        and(eq(governanceApprovals.proposal, proposalId), eq(governanceApprovals.admin, adminId))
      )
      .limit(1)

    if (existing) throw new Error('You have already signed this proposal')

    await db.insert(governanceApprovals).values({
      proposal: proposalId,
      admin: adminId,
      signature: this.sign(proposal.digest, key.privateKey),
    })

    await this.maybeExecute(proposalId)
    return this.getProposal(proposalId)
  }

  /** Reject a pending proposal (a single rejection cancels it). */
  async reject(adminId: string, proposalId: string) {
    const [proposal] = await db
      .select()
      .from(governanceProposals)
      .where(eq(governanceProposals.id, proposalId))
      .limit(1)

    if (!proposal) throw new Error('Proposal not found')
    if (proposal.status !== 'pending') throw new Error(`Proposal is already ${proposal.status}`)

    await db
      .update(governanceProposals)
      .set({ status: 'rejected' })
      .where(eq(governanceProposals.id, proposalId))

    return this.getProposal(proposalId)
  }

  // -------------------------------------------------------------------------
  // Execution
  // -------------------------------------------------------------------------

  /**
   * If enough distinct valid signatures exist, verify them all and execute.
   */
  private async maybeExecute(proposalId: string) {
    const [proposal] = await db
      .select()
      .from(governanceProposals)
      .where(eq(governanceProposals.id, proposalId))
      .limit(1)

    if (!proposal || proposal.status !== 'pending') return

    const approvals = await db
      .select()
      .from(governanceApprovals)
      .where(eq(governanceApprovals.proposal, proposalId))

    const distinct = new Set(approvals.map((a) => a.admin))
    if (distinct.size < proposal.threshold) return

    // Verify every collected signature against its signer's public key.
    for (const approval of approvals) {
      const [key] = await db
        .select()
        .from(adminKeys)
        .where(eq(adminKeys.adminId, approval.admin))
        .limit(1)
      if (!key || !this.verify(proposal.digest, approval.signature, key.publicKey)) {
        throw new Error('Invalid approval signature — refusing to execute')
      }
    }

    await this.applyAction(proposal)
  }

  private async applyAction(proposal: typeof governanceProposals.$inferSelect) {
    switch (proposal.action) {
      case 'activate':
        await db
          .update(elections)
          .set({ status: 'active', startDate: new Date() })
          .where(eq(elections.id, proposal.election))
        break

      case 'close':
        await db
          .update(elections)
          .set({ status: 'completed', endDate: new Date() })
          .where(eq(elections.id, proposal.election))
        break

      case 'publish_results':
        await resultService.calculateResults(proposal.election, proposal.createdBy)
        break

      default:
        throw new Error(`Unknown governance action: ${proposal.action}`)
    }

    await db
      .update(governanceProposals)
      .set({ status: 'executed', executedAt: new Date() })
      .where(eq(governanceProposals.id, proposal.id))
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  async getProposal(id: string) {
    const [proposal] = await db
      .select()
      .from(governanceProposals)
      .where(eq(governanceProposals.id, id))
      .limit(1)

    if (!proposal) throw new Error('Proposal not found')

    const approvals = await db
      .select({
        admin: governanceApprovals.admin,
        username: admins.username,
        signature: governanceApprovals.signature,
        createdAt: governanceApprovals.createdAt,
      })
      .from(governanceApprovals)
      .innerJoin(admins, eq(governanceApprovals.admin, admins.id))
      .where(eq(governanceApprovals.proposal, id))

    return {
      ...proposal,
      approvals,
      approvalCount: new Set(approvals.map((a) => a.admin)).size,
    }
  }

  async listProposals(electionId?: string) {
    const rows = electionId
      ? await db
          .select()
          .from(governanceProposals)
          .where(eq(governanceProposals.election, electionId))
          .orderBy(desc(governanceProposals.createdAt))
      : await db
          .select()
          .from(governanceProposals)
          .orderBy(desc(governanceProposals.createdAt))

    if (rows.length === 0) return []

    // The console renders each proposal's signers, so include the approvals in
    // the list response too (the detail endpoint already does this).
    const approvals = await db
      .select({
        proposal: governanceApprovals.proposal,
        admin: governanceApprovals.admin,
        username: admins.username,
        signature: governanceApprovals.signature,
        createdAt: governanceApprovals.createdAt,
      })
      .from(governanceApprovals)
      .innerJoin(admins, eq(governanceApprovals.admin, admins.id))
      .where(inArray(governanceApprovals.proposal, rows.map((row) => row.id)))

    const approvalsByProposal = new Map<string, typeof approvals>()
    for (const approval of approvals) {
      const list = approvalsByProposal.get(approval.proposal) ?? []
      list.push(approval)
      approvalsByProposal.set(approval.proposal, list)
    }

    return rows.map((proposal) => {
      const proposalApprovals = approvalsByProposal.get(proposal.id) ?? []
      return {
        ...proposal,
        approvals: proposalApprovals.map(({ proposal: _proposal, ...approval }) => approval),
        approvalCount: new Set(proposalApprovals.map((a) => a.admin)).size,
      }
    })
  }
}

export const governanceService = new GovernanceService()
