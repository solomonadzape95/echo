import { and, eq } from 'drizzle-orm'
import { blindSign, decodeBytes, encodeBytes } from '../vendor/blindvote-shared'
import { db } from '../db/db'
import { elections } from '../models/election.schema'
import { issuances } from '../models/issuance.schema'
import { checkEligibilityByDomain } from '../helpers/eligibility.helpers'
import { getElectionPhase, electionPhaseMessage } from '../helpers/electionState.helpers'
import { raKeyService } from './raKey.service'

/**
 * Registration Authority.
 *
 * Verifies eligibility and blind-signs a token payload. It records only that a
 * voter was authorised for an election (the `issuances` marker) — never the
 * token, the blinded payload, or any link to a later ballot.
 */
export class RegistrationAuthorityService {
  async getPublicKey() {
    const key = await raKeyService.getActiveKey()
    return { publicKey: key.publicKeyB64, variant: key.variant }
  }

  /**
   * Blind-sign a payload for an authenticated, eligible voter.
   *
   * The RA sees only `blindedMsg`. It cannot derive the token.
   */
  async signBlinded(voterId: string, electionId: string, blindedMsgB64: string) {
    // 1. Election must exist
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // 2. Voting must be open. Dates are authoritative because the stored
    //    status is refreshed lazily when election lists are fetched.
    const phase = getElectionPhase(election)
    if (phase !== 'active') {
      throw new Error(electionPhaseMessage(phase))
    }

    // 3. Voter must be eligible (domain matching)
    const eligibility = await checkEligibilityByDomain(voterId, electionId)
    if (!eligibility.eligible) {
      throw new Error(
        `Voter is not eligible to vote in this election: ${eligibility.reason || 'Domain mismatch'}`
      )
    }

    // 4. One signature per voter per election. A voter who has already voted
    //    cannot be re-authorised. Before voting they may re-request a signature
    //    (e.g. lost token); the voted_at check at ingestion still guarantees a
    //    single vote.
    const [issuance] = await db
      .select()
      .from(issuances)
      .where(and(eq(issuances.voterId, voterId), eq(issuances.election, electionId)))
      .limit(1)

    if (issuance?.votedAt) {
      throw new Error('You have already voted in this election')
    }

    // 5. Blind-sign. The RA never learns the token.
    const { privateKey } = await raKeyService.getActiveKey()
    const blindSignature = await blindSign(privateKey, decodeBytes(blindedMsgB64))

    // 6. Record the anonymous issuance marker once. The unique index on
    //    (election, voter) plus ON CONFLICT makes concurrent first requests
    //    idempotent instead of creating duplicate issuance rows.
    if (!issuance) {
      await db
        .insert(issuances)
        .values({ election: electionId, voterId })
        .onConflictDoNothing()
    }

    return { blindSignature: encodeBytes(blindSignature) }
  }
}

export const registrationAuthorityService = new RegistrationAuthorityService()
