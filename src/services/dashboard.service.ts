import { eq, and, gte, lte, sql, or } from 'drizzle-orm'
import { db } from '../db/db'
import { voters } from '../models/voter.schema'
import { elections } from '../models/election.schema'
import { issuances } from '../models/issuance.schema'
import { votes } from '../models/vote.schema'
import { tokens } from '../models/token.schema'
import { classes } from '../models/class.schema'
import { departments } from '../models/department.schema'
import { faculties } from '../models/faculty.schema'

export class DashboardService {
  /**
   * Get dashboard data for a voter
   * Aggregates: user profile, active election, upcoming election, stats
   */
  async getDashboardData(voterId: string) {
    console.log('[DASHBOARD SERVICE] Getting dashboard data for voter:', voterId)

    // 1. Get voter info with class details
    const [voter] = await db
      .select({
        id: voters.id,
        username: voters.username,
        regNumber: voters.regNumber,
        classId: voters.class,
        createdAt: voters.createdAt,
        classLevel: classes.level,
        departmentId: departments.id,
        departmentName: departments.name,
        facultyId: faculties.id,
        facultyName: faculties.name,
      })
      .from(voters)
      .leftJoin(classes, eq(voters.class, classes.id))
      .leftJoin(departments, eq(classes.department, departments.id))
      .leftJoin(faculties, eq(classes.faculty, faculties.id))
      .where(eq(voters.id, voterId))
      .limit(1)

    if (!voter) {
      throw new Error('Voter not found')
    }

    const now = new Date()

    // 2. Get active election (status='active' and current date between startDate and endDate)
    const [activeElection] = await db
      .select()
      .from(elections)
      .where(
        and(
          eq(elections.status, 'active'),
          lte(elections.startDate, now),
          gte(elections.endDate, now)
        )
      )
      .orderBy(elections.endDate)
      .limit(1)

    // 3. Get upcoming election (status='pending' or startDate > now, ordered by startDate)
    const [upcomingElection] = await db
      .select()
      .from(elections)
      .where(
        or(
          eq(elections.status, 'pending'),
          gte(elections.startDate, now)
        )
      )
      .orderBy(elections.startDate)
      .limit(1)

    // 4. Get stats
    // - Total elections the voter is eligible for (issuances count)
    const [issuancesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(issuances)
      .where(eq(issuances.voterId, voterId))

    // - Elections the voter has voted in
    // Count distinct elections where the voter has cast a vote
    // Join issuances -> tokens -> votes to find elections with votes
    const votesData = await db
      .select({
        electionId: votes.election,
      })
      .from(issuances)
      .innerJoin(tokens, eq(issuances.election, tokens.election))
      .innerJoin(votes, eq(tokens.tokenHash, votes.tokenId))
      .where(eq(issuances.voterId, voterId))

    // Get distinct election IDs
    const uniqueElectionIds = new Set(votesData.map(v => v.electionId))
    const electionsVotedIn = uniqueElectionIds.size

    // - Total elections count
    const [totalElections] = await db
      .select({ count: sql<number>`count(*)` })
      .from(elections)

    return {
      profile: {
        id: voter.id,
        username: voter.username,
        regNumber: voter.regNumber,
        class: voter.classId ? {
          id: voter.classId,
          name: voter.classLevel,
          department: voter.departmentId ? {
            id: voter.departmentId,
            name: voter.departmentName,
            faculty: voter.facultyId ? {
              id: voter.facultyId,
              name: voter.facultyName,
            } : undefined,
          } : undefined,
        } : undefined,
        createdAt: voter.createdAt,
      },
      activeElection: activeElection ? {
        id: activeElection.id,
        name: activeElection.name,
        description: activeElection.description,
        startDate: activeElection.startDate,
        endDate: activeElection.endDate,
        type: activeElection.type,
        status: activeElection.status,
      } : null,
      upcomingElection: upcomingElection ? {
        id: upcomingElection.id,
        name: upcomingElection.name,
        description: upcomingElection.description,
        startDate: upcomingElection.startDate,
        endDate: upcomingElection.endDate,
        type: upcomingElection.type,
        status: upcomingElection.status,
      } : null,
      stats: {
        totalElections: Number(totalElections?.count || 0),
        eligibleElections: Number(issuancesCount?.count || 0),
        electionsVotedIn,
        votesCast: electionsVotedIn, // Number of elections voted in
      },
    }
  }
}

export const dashboardService = new DashboardService()

