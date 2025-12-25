import { eq, and } from 'drizzle-orm'
import { db } from '../db/db'
import { issuances } from '../models/issuance.schema'
import { elections } from '../models/election.schema'
import { voters } from '../models/voter.schema'
import type { CreateIssuanceInput } from '../validators/issuance.validator'

export class IssuanceService {
  /**
   * Create a new issuance
   */
  async create(input: CreateIssuanceInput) {
    // Verify election exists
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, input.electionId))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // Verify voter exists
    const [voter] = await db
      .select()
      .from(voters)
      .where(eq(voters.id, input.voterId))
      .limit(1)

    if (!voter) {
      throw new Error('Voter not found')
    }

    // Check if issuance already exists for this voter and election
    const [existing] = await db
      .select()
      .from(issuances)
      .where(and(
        eq(issuances.election, input.electionId),
        eq(issuances.voterId, input.voterId)
      ))
      .limit(1)

    if (existing) {
      throw new Error('Issuance already exists for this voter and election')
    }

    // Create issuance
    const [newIssuance] = await db
      .insert(issuances)
      .values({
        election: input.electionId,
        voterId: input.voterId,
      })
      .returning()

    if (!newIssuance) {
      throw new Error('Failed to create issuance')
    }

    return newIssuance
  }

  /**
   * Get all issuances
   */
  async getAll() {
    return await db.select().from(issuances)
  }

  /**
   * Get issuance by ID
   */
  async getById(id: string) {
    const [issuance] = await db
      .select()
      .from(issuances)
      .where(eq(issuances.id, id))
      .limit(1)

    if (!issuance) {
      throw new Error('Issuance not found')
    }

    return issuance
  }

  /**
   * Get issuances by election
   */
  async getByElection(electionId: string) {
    return await db
      .select()
      .from(issuances)
      .where(eq(issuances.election, electionId))
  }

  /**
   * Get issuances by voter
   */
  async getByVoter(voterId: string) {
    return await db
      .select()
      .from(issuances)
      .where(eq(issuances.voterId, voterId))
  }

  /**
   * Check if voter has issuance for election
   */
  async hasIssuance(voterId: string, electionId: string) {
    const [issuance] = await db
      .select()
      .from(issuances)
      .where(and(
        eq(issuances.election, electionId),
        eq(issuances.voterId, voterId)
      ))
      .limit(1)

    return !!issuance
  }
}

export const issuanceService = new IssuanceService()

