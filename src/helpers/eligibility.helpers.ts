import { eq, or } from 'drizzle-orm'
import { db } from '../db/db'
import { voters } from '../models/voter.schema'
import { classes } from '../models/class.schema'
import { elections } from '../models/election.schema'

/**
 * Eligibility Helper Functions
 * 
 * Determines voter eligibility based on election domain matching.
 * Eligibility is determined by matching the election's domainId to the voter's
 * class, department, or faculty based on the election type.
 */

export interface EligibilityResult {
  eligible: boolean
  reason?: string
}

/**
 * Check if a voter is eligible for an election based on domain matching
 * 
 * @param voterId - The voter's ID
 * @param electionId - The election ID
 * @returns Eligibility result with reason if not eligible
 */
export async function checkEligibilityByDomain(
  voterId: string,
  electionId: string
): Promise<EligibilityResult> {
  // 1. Get election
  const [election] = await db
    .select()
    .from(elections)
    .where(eq(elections.id, electionId))
    .limit(1)

  if (!election) {
    return { eligible: false, reason: 'Election not found' }
  }

  // 2. Get voter with their class
  const [voter] = await db
    .select()
    .from(voters)
    .where(eq(voters.id, voterId))
    .limit(1)

  if (!voter) {
    return { eligible: false, reason: 'Voter not found' }
  }

  // 3. Get voter's class with department and faculty
  const [voterClass] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, voter.class))
    .limit(1)

  if (!voterClass) {
    return { eligible: false, reason: 'Voter class not found' }
  }

  // 4. Match election domain based on election type
  switch (election.type) {
    case 'class':
      // Election is for a specific class
      if (election.domainId === voter.class) {
        return { eligible: true }
      }
      return { 
        eligible: false, 
        reason: 'Election is for a different class' 
      }

    case 'department':
      // Election is for a specific department
      if (election.domainId === voterClass.department) {
        return { eligible: true }
      }
      return { 
        eligible: false, 
        reason: 'Election is for a different department' 
      }

    case 'faculty':
      // Election is for a specific faculty
      if (election.domainId === voterClass.faculty) {
        return { eligible: true }
      }
      return { 
        eligible: false, 
        reason: 'Election is for a different faculty' 
      }

    default:
      return { 
        eligible: false, 
        reason: 'Invalid election type' 
      }
  }
}

/**
 * Get all elections a voter is eligible for based on their domain
 * 
 * @param voterId - The voter's ID
 * @returns Array of election IDs the voter is eligible for
 */
export async function getEligibleElectionsForVoter(
  voterId: string
): Promise<string[]> {
  // 1. Get voter with their class
  const [voter] = await db
    .select()
    .from(voters)
    .where(eq(voters.id, voterId))
    .limit(1)

  if (!voter) {
    return []
  }

  // 2. Get voter's class with department and faculty
  const [voterClass] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, voter.class))
    .limit(1)

  if (!voterClass) {
    return []
  }

  // 3. Get all elections where domainId matches voter's class, department, or faculty
  const eligibleElections = await db
    .select({ id: elections.id })
    .from(elections)
    .where(
      or(
        eq(elections.domainId, voter.class), // Match class elections
        eq(elections.domainId, voterClass.department), // OR match department elections
        eq(elections.domainId, voterClass.faculty) // OR match faculty elections
      )
    )

  return eligibleElections.map(e => e.id)
}

