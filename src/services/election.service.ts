import { eq, and, sql, lte, gte, or } from 'drizzle-orm'
import { db } from '../db/db'
import { elections } from '../models/election.schema'
import { offices } from '../models/office.schema'
import { voters } from '../models/voter.schema'
import { classes } from '../models/class.schema'
import type { CreateElectionInput, UpdateElectionInput } from '../validators/election.validator'
import { generateSlug, generateUniqueSlug } from '../helpers/slug.helpers'

export class ElectionService {
  /**
   * Create a new election
   */
  async create(input: CreateElectionInput) {
    // Convert date strings to Date objects if needed
    const startDate = typeof input.startDate === 'string' ? new Date(input.startDate) : input.startDate
    const endDate = typeof input.endDate === 'string' ? new Date(input.endDate) : input.endDate

    // Validate dates
    if (endDate <= startDate) {
      throw new Error('End date must be after start date')
    }

    // Generate unique slug
    const baseSlug = generateSlug(input.name)
    const slug = await generateUniqueSlug(
      baseSlug,
      async (slug) => {
        const [existing] = await db
          .select()
          .from(elections)
          .where(eq(elections.slug, slug))
          .limit(1)
        return !existing
      }
    )

    // Create election
    const [newElection] = await db
      .insert(elections)
      .values({
        name: input.name,
        slug,
        type: input.type,
        status: input.status || 'pending',
        startDate,
        endDate,
        description: input.description,
        domainId: input.domainId,
      })
      .returning()

    if (!newElection) {
      throw new Error('Failed to create election')
    }

    // If offices are provided, create them for this election
    if (input.offices && input.offices.length > 0) {
      // Generate slugs for each office
      const officeValues = await Promise.all(
        input.offices.map(async (office) => {
          const baseSlug = generateSlug(office.title)
          const slug = await generateUniqueSlug(
            baseSlug,
            async (slug) => {
              const [existing] = await db
                .select()
                .from(offices)
                .where(eq(offices.slug, slug))
                .limit(1)
              return !existing
            }
          )
          return {
            name: office.title,
            slug,
            description: office.description,
            election: newElection.id,
            dependsOn: null, // No dependencies by default
          }
        })
      )

      await db.insert(offices).values(officeValues)
    }

    return newElection
  }

  /**
   * Update election statuses based on current date
   * This should be called periodically or when fetching elections
   */
  async updateElectionStatuses() {
    const now = new Date()
    
    // Update pending elections that should be active
    await db
      .update(elections)
      .set({ status: 'active' })
      .where(
        and(
          eq(elections.status, 'pending'),
          lte(elections.startDate, now)
        )
      )
    
    // Update active elections that should be completed
    await db
      .update(elections)
      .set({ status: 'completed' })
      .where(
        and(
          eq(elections.status, 'active'),
          lte(elections.endDate, now)
        )
      )
  }

  /**
   * Get all elections (with automatic status updates)
   */
  async getAll() {
    // Update statuses before fetching
    await this.updateElectionStatuses()
    return await db.select().from(elections)
  }

  /**
   * Get elections eligible for a specific voter (filtered by domain)
   * Returns elections where domainId matches voter's class, department, or faculty
   */
  async getEligibleForVoter(voterId: string) {
    // Update statuses before fetching
    await this.updateElectionStatuses()

    // 1. Get voter with their class
    const [voter] = await db
      .select()
      .from(voters)
      .where(eq(voters.id, voterId))
      .limit(1)

    if (!voter || !voter.class) {
      // Voter has no class - return empty array
      return []
    }

    // 2. Get voter's class with department and faculty
    const [voterClass] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, voter.class))
      .limit(1)

    if (!voterClass) {
      // Voter class not found - return empty array
      return []
    }

    // 3. Get all elections where domainId matches voter's class, department, or faculty
    const eligibleElections = await db
      .select()
      .from(elections)
      .where(
        or(
          eq(elections.domainId, voter.class), // Match class elections
          eq(elections.domainId, voterClass.department), // OR match department elections
          eq(elections.domainId, voterClass.faculty) // OR match faculty elections
        )
      )

    return eligibleElections
  }

  /**
   * Get election by ID (with automatic status update)
   */
  async getById(id: string) {
    // Update statuses before fetching
    await this.updateElectionStatuses()
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, id))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    return election
  }

  /**
   * Get election by slug (with automatic status update)
   */
  async getBySlug(slug: string) {
    // Update statuses before fetching
    await this.updateElectionStatuses()
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.slug, slug))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    return election
  }

  /**
   * Get elections by type
   */
  async getByType(type: 'class' | 'department' | 'faculty') {
    return await db
      .select()
      .from(elections)
      .where(eq(elections.type, type))
  }

  /**
   * Get elections by status (with automatic status updates)
   */
  async getByStatus(status: 'pending' | 'active' | 'completed') {
    // Update statuses before fetching
    await this.updateElectionStatuses()
    return await db
      .select()
      .from(elections)
      .where(eq(elections.status, status))
  }

  /**
   * Get elections by domain (class/department/faculty ID)
   */
  async getByDomain(domainId: string) {
    return await db
      .select()
      .from(elections)
      .where(eq(elections.domainId, domainId))
  }

  /**
   * Get active elections
   */
  async getActive() {
    return await db
      .select()
      .from(elections)
      .where(eq(elections.status, 'active'))
  }

  /**
   * Update election
   */
  async update(id: string, input: UpdateElectionInput) {
    // Check if election exists
    const [existing] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Election not found')
    }

    // Prepare update data
    const updateData: any = {}
    
    if (input.name) updateData.name = input.name
    if (input.type) updateData.type = input.type
    if (input.status) updateData.status = input.status
    if (input.description) updateData.description = input.description
    if (input.domainId) updateData.domainId = input.domainId

    // Handle dates
    if (input.startDate) {
      updateData.startDate = typeof input.startDate === 'string' 
        ? new Date(input.startDate) 
        : input.startDate
    }
    if (input.endDate) {
      updateData.endDate = typeof input.endDate === 'string' 
        ? new Date(input.endDate) 
        : input.endDate
    }

    // Validate dates if both are being updated
    if (updateData.startDate && updateData.endDate) {
      if (updateData.endDate <= updateData.startDate) {
        throw new Error('End date must be after start date')
      }
    } else if (updateData.startDate && existing.endDate) {
      if (existing.endDate <= updateData.startDate) {
        throw new Error('End date must be after start date')
      }
    } else if (updateData.endDate && existing.startDate) {
      if (updateData.endDate <= existing.startDate) {
        throw new Error('End date must be after start date')
      }
    }

    // Update election
    const [updated] = await db
      .update(elections)
      .set(updateData)
      .where(eq(elections.id, id))
      .returning()

    return updated
  }

  /**
   * Delete election
   */
  async delete(id: string) {
    // Check if election exists
    const [existing] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Election not found')
    }

    // TODO: Check if election has offices before deleting
    // For now, let database foreign key constraint handle it

    await db
      .delete(elections)
      .where(eq(elections.id, id))

    return { success: true }
  }
}

export const electionService = new ElectionService()

