import { eq, desc } from 'drizzle-orm'
import { db } from '../db/db'
import { voters } from '../models/voter.schema'
import { classes } from '../models/class.schema'
import { masterlist } from '../models/masterlist.schema'
import { votes } from '../models/vote.schema'
import { receipts } from '../models/receipt.schema'
import { elections } from '../models/election.schema'
import { issuances } from '../models/issuance.schema'
import { tokens } from '../models/token.schema'

export class ProfileService {
  /**
   * Get full profile data for a voter including voting history
   */
  async getProfileData(voterId: string) {
    console.log('[PROFILE SERVICE] Getting profile data for voter:', voterId)

    // 1. Get voter info with class details and name from masterlist
    const [voter] = await db
      .select({
        id: voters.id,
        username: voters.username,
        regNumber: voters.regNumber,
        classId: voters.class,
        createdAt: voters.createdAt,
        classLevel: classes.level,
        department: classes.department, // Now enum value directly
        faculty: classes.faculty, // Now enum value directly
        name: masterlist.name,
      })
      .from(voters)
      .leftJoin(classes, eq(voters.class, classes.id))
      .leftJoin(masterlist, eq(voters.regNumber, masterlist.regNo))
      .where(eq(voters.id, voterId))
      .limit(1)

    if (!voter) {
      throw new Error('Voter not found')
    }

    // 2. Get voting history
    // Join issuances -> tokens (via tokenHash) -> votes -> elections to get voting history
    const votingHistory = await db
      .select({
        voteId: votes.id,
        electionId: votes.election,
        electionName: elections.name,
        electionDescription: elections.description,
        votedAt: votes.createdAt,
        receiptCode: receipts.receiptCode,
      })
      .from(issuances)
      .innerJoin(tokens, eq(issuances.tokenHash, tokens.tokenHash)) // Now join directly on tokenHash
      .innerJoin(votes, eq(tokens.tokenHash, votes.tokenId))
      .innerJoin(elections, eq(votes.election, elections.id))
      .leftJoin(receipts, eq(votes.id, receipts.voteId))
      .where(eq(issuances.voterId, voterId))
      .orderBy(desc(votes.createdAt))

    return {
      profile: {
        id: voter.id,
        username: voter.username,
        regNumber: voter.regNumber,
        name: voter.name || voter.username,
        class: voter.classId ? {
          id: voter.classId,
          name: voter.classLevel,
          department: voter.department || undefined,
          faculty: voter.faculty || undefined,
        } : undefined,
        createdAt: voter.createdAt,
        isVerified: !!voter.name, // Verified if name exists in masterlist
      },
      votingHistory: votingHistory.map(vote => ({
        voteId: vote.voteId,
        electionId: vote.electionId,
        electionName: vote.electionName,
        electionDescription: vote.electionDescription,
        votedAt: vote.votedAt,
        receiptCode: vote.receiptCode,
      })),
    }
  }
}

export const profileService = new ProfileService()

