import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { candidates } from '../models/candidate.schema'
import { offices } from '../models/office.schema'
import { voters } from '../models/voter.schema'
import type { CreateCandidateInput, UpdateCandidateInput } from '../validators/candidate.validator'

export class CandidateService {
  /**
   * Create a new candidate
   */
  async create(input: CreateCandidateInput) {
    // Verify office exists
    const [office] = await db
      .select()
      .from(offices)
      .where(eq(offices.id, input.officeId))
      .limit(1)

    if (!office) {
      throw new Error('Office not found')
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

    // Check if candidate already exists for this office
    const [existing] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.office, input.officeId))
      .where(eq(candidates.voterId, input.voterId))
      .limit(1)

    if (existing) {
      throw new Error('Candidate already exists for this office')
    }

    // Create candidate
    const [newCandidate] = await db
      .insert(candidates)
      .values({
        office: input.officeId,
        voterId: input.voterId,
        quote: input.quote || '',
        manifesto: input.manifesto || '',
        image: input.image || '',
      })
      .returning()

    return newCandidate
  }

  /**
   * Get all candidates
   */
  async getAll() {
    return await db.select().from(candidates)
  }

  /**
   * Get candidate by ID
   */
  async getById(id: string) {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id))
      .limit(1)

    if (!candidate) {
      throw new Error('Candidate not found')
    }

    return candidate
  }

  /**
   * Get candidates by office
   */
  async getByOffice(officeId: string) {
    return await db
      .select()
      .from(candidates)
      .where(eq(candidates.office, officeId))
  }

  /**
   * Update candidate
   */
  async update(id: string, input: UpdateCandidateInput) {
    // Check if candidate exists
    const [existing] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Candidate not found')
    }

    // Update candidate
    const [updated] = await db
      .update(candidates)
      .set({
        quote: input.quote,
        manifesto: input.manifesto,
        image: input.image,
      })
      .where(eq(candidates.id, id))
      .returning()

    return updated
  }

  /**
   * Delete candidate
   */
  async delete(id: string) {
    // Check if candidate exists
    const [existing] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Candidate not found')
    }

    await db
      .delete(candidates)
      .where(eq(candidates.id, id))

    return { success: true }
  }
}

export const candidateService = new CandidateService()

