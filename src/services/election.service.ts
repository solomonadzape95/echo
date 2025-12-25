import { eq, and } from 'drizzle-orm'
import { db } from '../db/db'
import { elections } from '../models/election.schema'
import type { CreateElectionInput, UpdateElectionInput } from '../validators/election.validator'

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

    // Create election
    const [newElection] = await db
      .insert(elections)
      .values({
        name: input.name,
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

    return newElection
  }

  /**
   * Get all elections
   */
  async getAll() {
    return await db.select().from(elections)
  }

  /**
   * Get election by ID
   */
  async getById(id: string) {
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
   * Get elections by type
   */
  async getByType(type: 'class' | 'department' | 'faculty') {
    return await db
      .select()
      .from(elections)
      .where(eq(elections.type, type))
  }

  /**
   * Get elections by status
   */
  async getByStatus(status: 'pending' | 'active' | 'completed') {
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

