import { and, eq } from 'drizzle-orm'
import { db } from '../db/db'
import { candidates } from '../models/candidate.schema'
import { offices } from '../models/office.schema'
import { voters } from '../models/voter.schema'
import { masterlist } from '../models/masterlist.schema'
import type { CreateCandidateInput, UpdateCandidateInput } from '../validators/candidate.validator'
import { generateSlug, generateUniqueSlug } from '../helpers/slug.helpers'

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

    // Verify voter exists and get name from masterlist
    const [voterData] = await db
      .select({
        voter: voters,
        name: masterlist.name,
      })
      .from(voters)
      .leftJoin(masterlist, eq(voters.regNumber, masterlist.regNo))
      .where(eq(voters.id, input.voterId))
      .limit(1)

    if (!voterData?.voter) {
      throw new Error('Voter not found')
    }

    // Check if candidate already exists for this office
    const [existing] = await db
      .select()
      .from(candidates)
      .where(and(
        eq(candidates.office, input.officeId),
        eq(candidates.voterId, input.voterId)
      ))
      .limit(1)

    if (existing) {
      throw new Error('Candidate already exists for this office')
    }

    // Generate unique slug from voter name or username
    const nameForSlug = voterData.name || voterData.voter.username
    const baseSlug = generateSlug(nameForSlug)
    const slug = await generateUniqueSlug(
      baseSlug,
      async (slug) => {
        const [existing] = await db
          .select()
          .from(candidates)
          .where(eq(candidates.slug, slug))
          .limit(1)
        return !existing
      }
    )

    // Create candidate
    const [newCandidate] = await db
      .insert(candidates)
      .values({
        slug,
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
   * Get candidate by ID with voter profile picture
   */
  async getById(id: string) {
    const [candidateData] = await db
      .select({
        candidate: candidates,
        voterProfilePicture: voters.profilePicture,
      })
      .from(candidates)
      .leftJoin(voters, eq(candidates.voterId, voters.id))
      .where(eq(candidates.id, id))
      .limit(1)

    if (!candidateData?.candidate) {
      throw new Error('Candidate not found')
    }

    return {
      ...candidateData.candidate,
      voterProfilePicture: candidateData.voterProfilePicture || null,
    }
  }

  /**
   * Get candidate by slug
   */
  async getBySlug(slug: string) {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.slug, slug))
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

