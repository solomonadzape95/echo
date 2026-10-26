import { eq, and, desc, isNotNull } from 'drizzle-orm'
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
        profilePicture: voters.profilePicture,
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

    // 2. Get voting history (which elections the voter has voted in).
    // The issuance marker records voter + election + votedAt only, so we can
    // report WHICH elections the voter voted in without linking to a ballot.
    const votingHistory = await db
      .select({
        electionId: issuances.election,
        electionName: elections.name,
        electionDescription: elections.description,
        votedAt: issuances.votedAt,
      })
      .from(issuances)
      .innerJoin(elections, eq(issuances.election, elections.id))
      .where(and(eq(issuances.voterId, voterId), isNotNull(issuances.votedAt)))
      .orderBy(desc(issuances.votedAt))

    return {
      profile: {
        id: voter.id,
        username: voter.username,
        regNumber: voter.regNumber,
        name: voter.name || voter.username,
        profilePicture: voter.profilePicture || null,
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
        voteId: null,
        electionId: vote.electionId,
        electionName: vote.electionName,
        electionDescription: vote.electionDescription,
        votedAt: vote.votedAt,
        receiptCode: null,
      })),
    }
  }

  /**
   * Update profile picture for a voter
   */
  async updateProfilePicture(voterId: string, profilePictureUrl: string) {
    const [updated] = await db
      .update(voters)
      .set({ profilePicture: profilePictureUrl })
      .where(eq(voters.id, voterId))
      .returning()

    if (!updated) {
      throw new Error('Voter not found')
    }

    return updated
  }
}

export const profileService = new ProfileService()

