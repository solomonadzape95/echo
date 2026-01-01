import { eq, and } from 'drizzle-orm'
import { db } from '../db/db'
import { elections } from '../models/election.schema'
import { tokens } from '../models/token.schema'
import { issuances } from '../models/issuance.schema'
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
    try {
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
    } catch (error: any) {
      console.error('[VERIFY ELIGIBILITY SERVICE] Error in verifyAndCreateToken:', error)
      console.error('[VERIFY ELIGIBILITY SERVICE] voterId:', voterId, 'electionId:', electionId)
      throw error
    }

    // 3. Check if issuance already exists for this voter and election
    const [existingIssuance] = await db
      .select()
      .from(issuances)
      .where(and(
        eq(issuances.voterId, voterId),
        eq(issuances.election, electionId)
      ))
      .limit(1)

    // 4. Generate deterministic token hash for this voter-election pair
    const tokenHash = this.generateTokenHash(voterId, electionId)
    
    // 5. Check if token already exists
    const [existingToken] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.tokenHash, tokenHash))
      .limit(1)

    if (existingToken) {
      // Token already exists, ensure issuance exists and is linked
      if (!existingIssuance) {
        // Create issuance with token hash link
        await db.insert(issuances).values({
          election: electionId,
          voterId: voterId,
          tokenHash: tokenHash,
        })
      } else if (!existingIssuance.tokenHash) {
        // Update existing issuance with token hash
        await db
          .update(issuances)
          .set({ tokenHash: tokenHash })
          .where(eq(issuances.id, existingIssuance.id))
      }
      
      return {
        token: existingToken,
        publicKey: blindSignatureService.getPublicKey(),
      }
    }

    // 6. Create new token
    const token = await tokenService.create({
      election: electionId,
      tokenHash,
    })

    // 7. Create or update issuance with token hash link
    if (existingIssuance) {
      // Update existing issuance with token hash
      await db
        .update(issuances)
        .set({ tokenHash: tokenHash })
        .where(eq(issuances.id, existingIssuance.id))
    } else {
      // Create new issuance with token hash
      await db.insert(issuances).values({
        election: electionId,
        voterId: voterId,
        tokenHash: tokenHash,
      })
    }

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
   * Generate a unique, deterministic token hash for a voter-election pair
   * This hash is deterministic (same voter + election = same hash)
   * which allows us to reliably check if a voter has voted
   */
  private generateTokenHash(voterId: string, electionId: string): string {
    // Generate a deterministic hash for this voter-election pair
    // Removed Date.now() to make it deterministic
    // This ensures one token per voter per election and allows reliable lookup
    const combined = `${voterId}:${electionId}`
    return crypto.createHash('sha256').update(combined).digest('hex')
  }
}

export const verifyEligibilityService = new VerifyEligibilityService()

