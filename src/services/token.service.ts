import { eq, and, isNull, not } from 'drizzle-orm'
import { db } from '../db/db'
import { tokens } from '../models/token.schema'
import { elections } from '../models/election.schema'
import type { CreateTokenInput, UpdateTokenInput } from '../validators/token.validator'

export class TokenService {
  /**
   * Create a new voting token
   */
  async create(input: CreateTokenInput) {
    // Verify election exists
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, input.election))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // Check if token hash already exists (should be unique)
    const [existing] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.tokenHash, input.tokenHash))
      .limit(1)

    if (existing) {
      throw new Error('Token hash already exists')
    }

    // Create token
    const [newToken] = await db
      .insert(tokens)
      .values({
        election: input.election,
        tokenHash: input.tokenHash,
        usedAt: null, // Token is unused by default
      })
      .returning()

    if (!newToken) {
      throw new Error('Failed to create token')
    }

    return newToken
  }

  /**
   * Get all tokens
   */
  async getAll() {
    return await db.select().from(tokens)
  }

  /**
   * Get token by ID
   */
  async getById(id: string) {
    const [token] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, id))
      .limit(1)

    if (!token) {
      throw new Error('Token not found')
    }

    return token
  }

  /**
   * Get token by hash
   */
  async getByHash(tokenHash: string) {
    const [token] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.tokenHash, tokenHash))
      .limit(1)

    if (!token) {
      throw new Error('Token not found')
    }

    return token
  }

  /**
   * Get tokens by election
   */
  async getByElection(electionId: string) {
    return await db
      .select()
      .from(tokens)
      .where(eq(tokens.election, electionId))
  }

  /**
   * Get unused tokens by election
   */
  async getUnusedByElection(electionId: string) {
    return await db
      .select()
      .from(tokens)
      .where(and(
        eq(tokens.election, electionId),
        isNull(tokens.usedAt)
      ))
  }

  /**
   * Get used tokens by election
   */
  async getUsedByElection(electionId: string) {
    return await db
      .select()
      .from(tokens)
      .where(and(
        eq(tokens.election, electionId),
        not(isNull(tokens.usedAt))
      ))
  }

  /**
   * Mark token as used
   */
  async markAsUsed(id: string) {
    // Check if token exists
    const [existing] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Token not found')
    }

    if (existing.usedAt) {
      throw new Error('Token has already been used')
    }

    // Mark as used
    const [updated] = await db
      .update(tokens)
      .set({ usedAt: new Date() })
      .where(eq(tokens.id, id))
      .returning()

    return updated
  }

  /**
   * Update token
   */
  async update(id: string, input: UpdateTokenInput) {
    // Check if token exists
    const [existing] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Token not found')
    }

    // Update token
    const updateData: any = {}
    if (input.usedAt !== undefined) updateData.usedAt = input.usedAt

    const [updated] = await db
      .update(tokens)
      .set(updateData)
      .where(eq(tokens.id, id))
      .returning()

    return updated
  }

  /**
   * Delete token
   */
  async delete(id: string) {
    // Check if token exists
    const [existing] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Token not found')
    }

    await db
      .delete(tokens)
      .where(eq(tokens.id, id))

    return { success: true }
  }

  /**
   * Check if token is valid and unused
   */
  async isValidAndUnused(tokenHash: string, electionId: string) {
    const [token] = await db
      .select()
      .from(tokens)
      .where(and(
        eq(tokens.tokenHash, tokenHash),
        eq(tokens.election, electionId)
      ))
      .limit(1)

    if (!token) {
      return { valid: false, message: 'Token not found' }
    }

    if (token.usedAt) {
      return { valid: false, message: 'Token has already been used' }
    }

    return { valid: true, token }
  }
}

export const tokenService = new TokenService()

