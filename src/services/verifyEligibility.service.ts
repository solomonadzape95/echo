import { eq, and } from 'drizzle-orm'
import { db } from '../db/db'
import { elections } from '../models/election.schema'
import { issuances } from '../models/issuance.schema'
import { tokenService } from './token.service'
import { blindSignatureService } from './blindSignature.service'
import { checkEligibilityByDomain } from '../helpers/eligibility.helpers'
import crypto from 'crypto'

export class VerifyEligibilityService {
  /**
   * Verify voter eligibility and issue a single-use voting token.
   *
   * Anonymity properties:
   * - The token is RANDOM. It is not derived from the voter id, so it cannot
   *   be recomputed from a voter's identity.
   * - The issuance marker stores only (voter, election). It is NOT linked to
   *   the token, so the database cannot map a voter to a token or a ballot.
   * - `votedAt` is set when the voter casts a vote, which enforces one vote per
   *   voter per election without storing which token or ballot was theirs.
   *
   * @returns The issued token and the RA public key (for optional blinding)
   */
  async verifyAndCreateToken(voterId: string, electionId: string) {
    // 1. Verify election exists
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // 2. Verify eligibility by domain matching (class/department/faculty)
    const eligibility = await checkEligibilityByDomain(voterId, electionId)

    if (!eligibility.eligible) {
      throw new Error(
        `Voter is not eligible to vote in this election: ${eligibility.reason || 'Domain mismatch'}`
      )
    }

    // 3. Find the issuance marker (voter + election only - no token link)
    const [existingIssuance] = await db
      .select()
      .from(issuances)
      .where(and(eq(issuances.voterId, voterId), eq(issuances.election, electionId)))
      .limit(1)

    // 4. Has the voter already voted?
    if (existingIssuance?.votedAt) {
      throw new Error('You have already voted in this election')
    }

    // 5. Issue a fresh RANDOM single-use token
    const tokenHash = crypto.randomBytes(32).toString('hex')
    const token = await tokenService.create({
      election: electionId,
      tokenHash,
    })

    // 6. Record the issuance marker once (voter + election, nothing else)
    if (!existingIssuance) {
      await db.insert(issuances).values({
        election: electionId,
        voterId,
      })
    }

    return {
      token,
      publicKey: blindSignatureService.getPublicKey(),
    }
  }

  /**
   * Get the issuance marker for a voter/election, if any.
   * Returns null when the voter has never been issued a token.
   */
  async getIssuance(voterId: string, electionId: string) {
    const [issuance] = await db
      .select()
      .from(issuances)
      .where(and(eq(issuances.voterId, voterId), eq(issuances.election, electionId)))
      .limit(1)

    return issuance || null
  }
}

export const verifyEligibilityService = new VerifyEligibilityService()
