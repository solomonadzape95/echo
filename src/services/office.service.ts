import { eq, and, not } from 'drizzle-orm'
import { db } from '../db/db'
import { offices } from '../models/office.schema'
import { elections } from '../models/election.schema'
import type { CreateOfficeInput, UpdateOfficeInput } from '../validators/office.validator'

export class OfficeService {
  /**
   * Create a new office
   */
  async create(input: CreateOfficeInput) {
    // Verify election exists
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, input.electionId))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // If dependsOn is provided, verify it exists and belongs to the same election
    if (input.dependsOn) {
      const [dependsOnOffice] = await db
        .select()
        .from(offices)
        .where(eq(offices.id, input.dependsOn))
        .limit(1)

      if (!dependsOnOffice) {
        throw new Error('Dependent office not found')
      }

      if (dependsOnOffice.election !== input.electionId) {
        throw new Error('Dependent office must belong to the same election')
      }
    }

    // Check if office already exists for this election
    const [existing] = await db
      .select()
      .from(offices)
      .where(and(
        eq(offices.name, input.name),
        eq(offices.election, input.electionId)
      ))
      .limit(1)

    if (existing) {
      throw new Error('Office already exists for this election')
    }

    // Create office
    const [newOffice] = await db
      .insert(offices)
      .values({
        name: input.name,
        description: input.description,
        election: input.electionId,
        dependsOn: input.dependsOn || null,
      })
      .returning()

    if (!newOffice) {
      throw new Error('Failed to create office')
    }

    return newOffice
  }

  /**
   * Get all offices
   */
  async getAll() {
    return await db.select().from(offices)
  }

  /**
   * Get office by ID
   */
  async getById(id: string) {
    const [office] = await db
      .select()
      .from(offices)
      .where(eq(offices.id, id))
      .limit(1)

    if (!office) {
      throw new Error('Office not found')
    }

    return office
  }

  /**
   * Get offices by election
   */
  async getByElection(electionId: string) {
    return await db
      .select()
      .from(offices)
      .where(eq(offices.election, electionId))
  }

  /**
   * Update office
   */
  async update(id: string, input: UpdateOfficeInput) {
    // Check if office exists
    const [existing] = await db
      .select()
      .from(offices)
      .where(eq(offices.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Office not found')
    }

    // Determine which election to validate against
    const electionId = input.electionId || existing.election

    // If election is being changed, verify new election exists
    if (input.electionId && input.electionId !== existing.election) {
      const [election] = await db
        .select()
        .from(elections)
        .where(eq(elections.id, input.electionId))
        .limit(1)

      if (!election) {
        throw new Error('Election not found')
      }
    }

    // If dependsOn is being updated, validate it
    if (input.dependsOn !== undefined) {
      if (input.dependsOn === null) {
        // Setting to null is allowed (removing dependency)
      } else {
        const [dependsOnOffice] = await db
          .select()
          .from(offices)
          .where(eq(offices.id, input.dependsOn))
          .limit(1)

        if (!dependsOnOffice) {
          throw new Error('Dependent office not found')
        }

        if (dependsOnOffice.election !== electionId) {
          throw new Error('Dependent office must belong to the same election')
        }

        // Prevent circular dependency (office depending on itself)
        if (input.dependsOn === id) {
          throw new Error('Office cannot depend on itself')
        }
      }
    }

    // Check for duplicates if name or election is changing
    if (input.name || input.electionId) {
      const [duplicate] = await db
        .select()
        .from(offices)
        .where(and(
          eq(offices.name, input.name || existing.name),
          eq(offices.election, electionId),
          not(eq(offices.id, id)) // Exclude current office
        ))
        .limit(1)

      if (duplicate) {
        throw new Error('Office already exists for this election')
      }
    }

    // Update office
    const updateData: any = {}
    if (input.name) updateData.name = input.name
    if (input.description) updateData.description = input.description
    if (input.electionId) updateData.election = input.electionId
    if (input.dependsOn !== undefined) updateData.dependsOn = input.dependsOn

    const [updated] = await db
      .update(offices)
      .set(updateData)
      .where(eq(offices.id, id))
      .returning()

    return updated
  }

  /**
   * Delete office
   */
  async delete(id: string) {
    // Check if office exists
    const [existing] = await db
      .select()
      .from(offices)
      .where(eq(offices.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Office not found')
    }

    // TODO: Check if office has candidates before deleting
    // For now, let database foreign key constraint handle it

    await db
      .delete(offices)
      .where(eq(offices.id, id))

    return { success: true }
  }
}

export const officeService = new OfficeService()

