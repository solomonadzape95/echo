import { eq, and, sql, lte, gte, or, inArray } from 'drizzle-orm'
import { db } from '../db/db'
import { elections } from '../models/election.schema'
import { offices } from '../models/office.schema'
import { voters } from '../models/voter.schema'
import { classes } from '../models/class.schema'
import { results } from '../models/result.schema'
import { receipts } from '../models/receipt.schema'
import { votes } from '../models/vote.schema'
import { tokens } from '../models/token.schema'
import { issuances } from '../models/issuance.schema'
import { candidates } from '../models/candidate.schema'
import { admins } from '../models/admin.schema'
import { ledgerAnchors } from '../models/ledgerAnchor.schema'
import { governanceApprovals, governanceProposals } from '../models/governance.schema'
import type { CreateElectionInput, UpdateElectionInput } from '../validators/election.validator'
import { generateSlug, generateUniqueSlug } from '../helpers/slug.helpers'
import { resultService } from './result.service'
import { notificationService } from './notification.service'

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
    const activated = await db
      .update(elections)
      .set({ status: 'active' })
      .where(
        and(
          eq(elections.status, 'pending'),
          lte(elections.startDate, now)
        )
      )
      .returning({
        id: elections.id,
        name: elections.name,
        endDate: elections.endDate,
        slug: elections.slug,
      })

    for (const election of activated) {
      await notificationService
        .notifyStarted(election.id, election.name, election.endDate, election.slug)
        .catch((error) => {
          console.error('[ELECTION SERVICE] Failed to notify start:', error?.message || error)
        })
    }
    
    // Close elections whose end date has passed. `returning` makes this safe
    // when two requests race: only the request that actually flips the status
    // receives the rows and publishes the results.
    const completed = await db
      .update(elections)
      .set({ status: 'completed' })
      .where(
        and(
          eq(elections.status, 'active'),
          lte(elections.endDate, now)
        )
      )
      .returning({ id: elections.id, name: elections.name, slug: elections.slug })

    for (const election of completed) {
      let published = false

      if (process.env.AUTO_PUBLISH_RESULTS !== 'false') {
        try {
          if (!(await this.hasResults(election.id))) {
            const adminId = await this.systemAdminId()
            if (!adminId) {
              console.warn('[ELECTION SERVICE] No admin available to publish results for', election.id)
            } else {
              const summary = await resultService.calculateResults(election.id, adminId)
              console.log(
                `[ELECTION SERVICE] Auto-published results for ${election.name}: ` +
                  `${summary.validVotes} valid / ${summary.invalidVotes} invalid, ` +
                  `${summary.resultsCount} result rows`
              )
              published = true
            }
          } else {
            published = true
          }
        } catch (error: any) {
          // A failed publication must not break the election list. Keep the
          // election completed and let an admin retry from the console.
          console.error(
            `[ELECTION SERVICE] Auto-publish failed for ${election.name} (${election.id}):`,
            error.message || error
          )
        }
      }

      try {
        if (published) {
          await notificationService.notifyResultsPublished(
            election.id,
            election.name,
            election.slug
          )
        } else {
          await notificationService.notifyEnded(election.id, election.name, election.slug)
        }
      } catch (error: any) {
        console.error('[ELECTION SERVICE] Failed to notify completion:', error?.message || error)
      }
    }
  }

  /** Whether results have already been stored for this election. */
  private async hasResults(electionId: string): Promise<boolean> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(results)
      .where(eq(results.election, electionId))
    return Number(row?.count ?? 0) > 0
  }

  /** System actor used as `calculatedBy` for automatic publication. */
  private async systemAdminId(): Promise<string | null> {
    const [admin] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.role, 'super_admin'))
      .limit(1)
    return admin?.id ?? null
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

    if (!voter || !voter.class || voter.disabled) {
      // Voter has no class or has been disabled - return empty array
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
   * Preview who would be eligible for an election before it is created.
   */
  async previewEligibility(type: 'class' | 'department' | 'faculty', domainId: string) {
    if (type === 'class') {
      const rows = await db
        .select({
          classId: classes.id,
          level: classes.level,
          department: classes.department,
          faculty: classes.faculty,
          voterId: voters.id,
        })
        .from(voters)
        .innerJoin(classes, eq(voters.class, classes.id))
        .where(and(eq(voters.class, domainId), eq(voters.disabled, false)))

      const classRow = rows[0]
      return {
        eligibleVoters: rows.length,
        classCount: rows.length > 0 ? 1 : 0,
        classes: classRow
          ? [{
              id: classRow.classId,
              level: classRow.level,
              department: classRow.department,
              faculty: classRow.faculty,
              voters: rows.length,
            }]
          : [],
      }
    }

    const rows = await db
      .select({
        classId: classes.id,
        level: classes.level,
        department: classes.department,
        faculty: classes.faculty,
        voterId: voters.id,
      })
      .from(voters)
      .innerJoin(classes, eq(voters.class, classes.id))
      .where(
        and(
          type === 'department'
            ? eq(classes.department, domainId as any)
            : eq(classes.faculty, domainId as any),
          eq(voters.disabled, false)
        )
      )

    const grouped = new Map<string, {
      id: string
      level: string
      department: string
      faculty: string
      voters: number
    }>()

    for (const row of rows) {
      const existing = grouped.get(row.classId)
      if (existing) {
        existing.voters++
      } else {
        grouped.set(row.classId, {
          id: row.classId,
          level: row.level,
          department: row.department,
          faculty: row.faculty,
          voters: 1,
        })
      }
    }

    return {
      eligibleVoters: rows.length,
      classCount: grouped.size,
      classes: [...grouped.values()].sort(
        (a, b) =>
          a.department.localeCompare(b.department) || a.level.localeCompare(b.level)
      ),
    }
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

    // An election that has already started cannot be stopped or rescheduled.
    // Once status is 'active', admins may edit descriptive fields only.
    if (existing.status === 'active') {
      if (input.status && input.status !== 'active') {
        throw new Error('This election has already started and cannot be stopped.')
      }
      if (input.startDate || input.endDate) {
        throw new Error('This election has already started and its schedule cannot be changed.')
      }
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
   * Delete election with cascading deletes
   * Deletes all dependent entities in the correct order within a transaction:
   * 1. Results (depends on election, office, candidate)
   * 2. Receipts (depends on election and vote)
   * 3. Votes (depends on election)
   * 4. Tokens (depends on election)
   * 5. Issuances (depends on election)
   * 6. Candidates (depends on office, which depends on election)
   * 7. Offices (depends on election)
   * 8. Election (finally delete the election itself)
   * 
   * All deletions are wrapped in a transaction to ensure atomicity.
   * If any deletion fails, all changes are rolled back.
   */
  async delete(id: string) {
    return await db.transaction(async (tx) => {
      // Check if election exists
      const [existing] = await tx
        .select()
        .from(elections)
        .where(eq(elections.id, id))
        .limit(1)

      if (!existing) {
        throw new Error('Election not found')
      }

      // An election that has already started cannot be deleted.
      if (existing.status === 'active') {
        throw new Error('This election has already started and cannot be deleted.')
      }

      // Get all offices for this election (needed for deleting candidates and results)
      const electionOffices = await tx
        .select({ id: offices.id })
        .from(offices)
        .where(eq(offices.election, id))

      const officeIds = electionOffices.map(o => o.id)

      // Get all candidates for these offices (needed for deleting results)
      let candidateIds: string[] = []
      if (officeIds.length > 0) {
        const electionCandidates = await tx
          .select({ id: candidates.id })
          .from(candidates)
          .where(inArray(candidates.office, officeIds))
        
        candidateIds = electionCandidates.map(c => c.id)
      }

      // Delete in correct order to respect foreign key constraints
      // 1. Delete results (depends on election, office, candidate)
      await tx
        .delete(results)
        .where(eq(results.election, id))

      // 2. Delete receipts (depends on election and vote)
      await tx
        .delete(receipts)
        .where(eq(receipts.election, id))

      // 3. Delete votes (depends on election)
      await tx
        .delete(votes)
        .where(eq(votes.election, id))

      // 4. Delete tokens (depends on election)
      await tx
        .delete(tokens)
        .where(eq(tokens.election, id))

      // 5. Delete issuances (depends on election)
      await tx
        .delete(issuances)
        .where(eq(issuances.election, id))

      // 6. Delete governance approvals and proposals tied to this election
      const proposals = await tx
        .select({ id: governanceProposals.id })
        .from(governanceProposals)
        .where(eq(governanceProposals.election, id))

      if (proposals.length > 0) {
        await tx
          .delete(governanceApprovals)
          .where(inArray(governanceApprovals.proposal, proposals.map((p) => p.id)))
        await tx
          .delete(governanceProposals)
          .where(eq(governanceProposals.election, id))
      }

      // 7. Delete the signed chain anchor (depends on election)
      await tx
        .delete(ledgerAnchors)
        .where(eq(ledgerAnchors.election, id))

      // 8. Delete candidates (depends on office, which depends on election)
      if (officeIds.length > 0) {
        await tx
          .delete(candidates)
          .where(inArray(candidates.office, officeIds))
      }

      // 9. Delete offices (depends on election)
      if (officeIds.length > 0) {
        await tx
          .delete(offices)
          .where(eq(offices.election, id))
      }

      // 10. Finally, delete the election itself
      await tx
        .delete(elections)
        .where(eq(elections.id, id))

      return { success: true }
    })
  }
}

export const electionService = new ElectionService()

