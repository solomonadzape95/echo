import { eq, and, sql, isNotNull, count } from 'drizzle-orm'
import { db } from '../db/db'
import { elections } from '../models/election.schema'
import { votes } from '../models/vote.schema'
import { tokens } from '../models/token.schema'
import { voters } from '../models/voter.schema'
import { classes } from '../models/class.schema'
import { issuances } from '../models/issuance.schema'

export class StatsService {
  /**
   * Check if a voter has voted in a specific election
   * 
   * Now uses the deterministic tokenHash stored in issuances to directly
   * check if the voter's token has been used.
   */
  async hasVoterVoted(voterId: string, electionId: string): Promise<boolean> {
    // Get issuance for this voter-election pair
    const [issuance] = await db
      .select()
      .from(issuances)
      .where(and(
        eq(issuances.voterId, voterId),
        eq(issuances.election, electionId)
      ))
      .limit(1)

    if (!issuance || !issuance.tokenHash) {
      return false // No issuance or token hash means they haven't been issued a token
    }

    // Check if the token linked to this issuance has been used
    const [token] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.tokenHash, issuance.tokenHash))
      .limit(1)

    if (!token) {
      return false // Token doesn't exist
    }

    // Return true if token has been used (voter has voted)
    return token.usedAt !== null
  }

  /**
   * Count eligible voters for an election based on election type and domain
   */
  async countEligibleVoters(electionId: string): Promise<number> {
    // Get election details
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // Count eligible voters based on election type
    switch (election.type) {
      case 'class':
        // Count voters in this specific class
        const [classCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(voters)
          .where(eq(voters.class, election.domainId))
        
        return Number(classCount?.count || 0)

      case 'department':
        // Count voters in classes that belong to this department
        const [deptCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(voters)
          .innerJoin(classes, eq(voters.class, classes.id))
          .where(eq(classes.department, election.domainId))
        
        return Number(deptCount?.count || 0)

      case 'faculty':
        // Count voters in classes that belong to this faculty
        const [facultyCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(voters)
          .innerJoin(classes, eq(voters.class, classes.id))
          .where(eq(classes.faculty, election.domainId))
        
        return Number(facultyCount?.count || 0)

      default:
        return 0
    }
  }

  /**
   * Count actual votes cast in an election
   */
  async countVotes(electionId: string): Promise<number> {
    const [voteCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(eq(votes.election, electionId))

    return Number(voteCount?.count || 0)
  }

  /**
   * Get statistics for a specific election
   */
  async getElectionStats(electionId: string) {
    // Get election details
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // Count eligible voters
    const eligibleVoters = await this.countEligibleVoters(electionId)
    
    // Count actual votes
    const votesCast = await this.countVotes(electionId)

    // Calculate turnout percentage
    const turnoutPercentage = eligibleVoters > 0 
      ? Number(((votesCast / eligibleVoters) * 100).toFixed(2))
      : 0

    // Count tokens issued (total tokens for this election)
    const [tokensIssued] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tokens)
      .where(eq(tokens.election, electionId))

    const totalTokensIssued = Number(tokensIssued?.count || 0)

    // Count tokens used (votes cast)
    const [tokensUsed] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tokens)
      .where(and(
        eq(tokens.election, electionId),
        isNotNull(tokens.usedAt)
      ))

    const totalTokensUsed = Number(tokensUsed?.count || 0)

    // Count unused tokens
    const unusedTokens = totalTokensIssued - totalTokensUsed

    return {
      election: {
        id: election.id,
        name: election.name,
        type: election.type,
        status: election.status,
        startDate: election.startDate,
        endDate: election.endDate,
      },
      turnout: {
        eligibleVoters,
        votesCast,
        turnoutPercentage,
        remainingVoters: eligibleVoters - votesCast,
      },
      tokens: {
        issued: totalTokensIssued,
        used: totalTokensUsed,
        unused: unusedTokens,
        usageRate: totalTokensIssued > 0 
          ? Number(((totalTokensUsed / totalTokensIssued) * 100).toFixed(2))
          : 0,
      },
    }
  }

  /**
   * Get overall statistics across all elections
   */
  async getOverallStats() {
    // Get all elections
    const allElections = await db
      .select()
      .from(elections)

    // Calculate stats for each election
    const electionStats = await Promise.all(
      allElections.map(async (election) => {
        const eligibleVoters = await this.countEligibleVoters(election.id)
        const votesCast = await this.countVotes(election.id)
        const turnoutPercentage = eligibleVoters > 0 
          ? Number(((votesCast / eligibleVoters) * 100).toFixed(2))
          : 0

        return {
          electionId: election.id,
          electionName: election.name,
          electionType: election.type,
          electionStatus: election.status,
          eligibleVoters,
          votesCast,
          turnoutPercentage,
        }
      })
    )

    // Calculate aggregate totals
    const totalEligibleVoters = electionStats.reduce(
      (sum, stat) => sum + stat.eligibleVoters,
      0
    )
    const totalVotesCast = electionStats.reduce(
      (sum, stat) => sum + stat.votesCast,
      0
    )
    const overallTurnoutPercentage = totalEligibleVoters > 0
      ? Number(((totalVotesCast / totalEligibleVoters) * 100).toFixed(2))
      : 0

    // Count elections by status
    const electionsByStatus = {
      pending: electionStats.filter(s => s.electionStatus === 'pending').length,
      active: electionStats.filter(s => s.electionStatus === 'active').length,
      completed: electionStats.filter(s => s.electionStatus === 'completed').length,
    }

    // Count elections by type
    const electionsByType = {
      class: electionStats.filter(s => s.electionType === 'class').length,
      department: electionStats.filter(s => s.electionType === 'department').length,
      faculty: electionStats.filter(s => s.electionType === 'faculty').length,
    }

    return {
      summary: {
        totalElections: allElections.length,
        totalEligibleVoters,
        totalVotesCast,
        overallTurnoutPercentage,
        electionsByStatus,
        electionsByType,
      },
      elections: electionStats,
    }
  }

  /**
   * Get voting participation for a specific voter across all elections
   */
  async getVoterParticipation(voterId: string) {
    // Get all elections
    const allElections = await db
      .select()
      .from(elections)

    // Check participation for each election
    const participation = await Promise.all(
      allElections.map(async (election) => {
        const hasVoted = await this.hasVoterVoted(voterId, election.id)
        const eligibleVoters = await this.countEligibleVoters(election.id)
        const votesCast = await this.countVotes(election.id)
        const turnoutPercentage = eligibleVoters > 0 
          ? Number(((votesCast / eligibleVoters) * 100).toFixed(2))
          : 0

        return {
          electionId: election.id,
          electionName: election.name,
          electionType: election.type,
          electionStatus: election.status,
          hasVoted,
          eligibleVoters,
          votesCast,
          turnoutPercentage,
        }
      })
    )

    const totalEligible = participation.filter(p => p.eligibleVoters > 0).length
    const totalVoted = participation.filter(p => p.hasVoted).length

    return {
      voterId,
      totalEligibleElections: totalEligible,
      totalElectionsVotedIn: totalVoted,
      participationRate: totalEligible > 0
        ? Number(((totalVoted / totalEligible) * 100).toFixed(2))
        : 0,
      elections: participation,
    }
  }
}

export const statsService = new StatsService()

