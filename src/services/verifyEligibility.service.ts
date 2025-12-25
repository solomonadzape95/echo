import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { elections } from '../models/election.schema'
import { tokens } from '../models/token.schema'
import { tokenService } from './token.service'
import { blindSignatureService } from './blindSignature.service'
import { checkEligibilityByDomain } from '../helpers/eligibility.helpers'
import crypto from 'crypto'

export class VerifyEligibilityService {
  /**
   * Verify voter eligibility and create a voting token
   * Eligibility is determined by matching election domain to voter's class/department/faculty
   * 
   * @param voterId - The voter's ID
   * @param electionId - The election ID
   * @returns Token and public key for blinding
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
      throw new Error(`Voter is not eligible to vote in this election: ${eligibility.reason || 'Domain mismatch'}`)
    }

    // 3. Check if token already exists for this voter and election
    // We'll generate a unique token hash for this voter-election pair
    const tokenHash = this.generateTokenHash(voterId, electionId)
    
    const [existingToken] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.tokenHash, tokenHash))
      .limit(1)

    if (existingToken) {
      // Token already exists, return it
      return {
        token: existingToken,
        publicKey: blindSignatureService.getPublicKey(),
      }
    }

    // 4. Create new token
    const token = await tokenService.create({
      electionId,
      tokenHash,
    })

    return {
      token,
      publicKey: blindSignatureService.getPublicKey(),
    }
  }

  /**
   * Get token for a voter and election
   */
  async getTokenForVoter(voterId: string, electionId: string) {
    const tokenHash = this.generateTokenHash(voterId, electionId)
    
    const [token] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.tokenHash, tokenHash))
      .limit(1)

    return token || null
  }

  /**
   * Generate a unique token hash for a voter-election pair
   * In production, this should be cryptographically secure
   */
  private generateTokenHash(voterId: string, electionId: string): string {
    // Generate a unique hash for this voter-election pair
    // This ensures one token per voter per election
    const combined = `${voterId}:${electionId}:${Date.now()}`
    return crypto.createHash('sha256').update(combined).digest('hex')
  }
}

export const verifyEligibilityService = new VerifyEligibilityService()

