import { eq, and, desc, inArray } from 'drizzle-orm'
import { db } from '../db/db'
import { results } from '../models/result.schema'
import { votes } from '../models/vote.schema'
import { elections } from '../models/election.schema'
import { offices } from '../models/office.schema'
import { candidates } from '../models/candidate.schema'
import { voters } from '../models/voter.schema'
import { voteService } from './vote.service'
import { voteEncryptionService } from './voteEncryption.service'
import crypto from 'crypto'

/**
 * Result Service
 * 
 * Handles calculation and retrieval of election results.
 * Results are calculated once by admins and stored for fast retrieval.
 */
export class ResultService {
  /**
   * Calculate and store election results
   * 
   * This method:
   * 1. Verifies election exists and is completed
   * 2. Verifies vote chain integrity
   * 3. Decrypts all votes
   * 4. Counts votes per candidate per office
   * 5. Calculates percentages
   * 6. Stores results in database
   * 
   * @param electionId - The election ID
   * @param calculatedBy - Admin ID who is calculating results
   * @returns Calculated results summary
   */
  async calculateResults(electionId: string, calculatedBy: string) {
    // 1. Verify election exists
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // 2. Verify election is completed (optional check - you might want to allow calculation before end date)
    // if (election.status !== 'completed') {
    //   throw new Error('Election must be completed before calculating results')
    // }

    // 3. Verify vote chain integrity
    const chainCheck = await voteService.verifyChain(electionId)
    if (!chainCheck.valid) {
      throw new Error(`Vote chain is invalid: ${chainCheck.message}. Cannot calculate results.`)
    }

    // 4. Get all votes for this election
    const allVotes = await voteService.getByElection(electionId)
    
    if (allVotes.length === 0) {
      throw new Error('No votes found for this election')
    }

    // 5. Get all offices for this election
    const electionOffices = await db
      .select()
      .from(offices)
      .where(eq(offices.election, electionId))

    if (electionOffices.length === 0) {
      throw new Error('No offices found for this election')
    }

    // 6. Get all candidates for this election's offices
    const officeIds = electionOffices.map(o => o.id)
    const candidatesByOffice: Record<string, Array<typeof candidates.$inferSelect>> = {}
    
    for (const office of electionOffices) {
      const officeCandidates = await db
        .select()
        .from(candidates)
        .where(eq(candidates.office, office.id))
      candidatesByOffice[office.id] = officeCandidates
    }

    // 7. Initialize tally structure: { officeId: { candidateId: count } }
    const tally: Record<string, Record<string, number>> = {}
    for (const office of electionOffices) {
      tally[office.id] = {}
      for (const candidate of candidatesByOffice[office.id]) {
        tally[office.id][candidate.id] = 0
      }
    }

    // 8. Decrypt and count votes
    let validVotes = 0
    let invalidVotes = 0
    const invalidVoteIds: string[] = []

    for (const vote of allVotes) {
      if (!vote.encryptedVoteData) {
        // Vote has no encrypted data, skip it
        invalidVotes++
        invalidVoteIds.push(vote.id)
        continue
      }

      try {
        // Decrypt the vote data
        const decryptedJson = voteEncryptionService.decryptVoteData(vote.encryptedVoteData)
        const voteData = JSON.parse(decryptedJson) // { officeId: candidateId, ... }

        // Verify integrity: check if hash matches
        const computedHash = crypto
          .createHash('sha256')
          .update(decryptedJson)
          .digest('hex')

        if (computedHash !== vote.voteDataHash) {
          // Vote data has been tampered with!
          invalidVotes++
          invalidVoteIds.push(vote.id)
          continue
        }

        // Count votes per office -> candidate
        for (const [officeId, candidateId] of Object.entries(voteData)) {
          if (typeof candidateId !== 'string') continue
          
          // Verify office exists in this election
          if (!electionOffices.find(o => o.id === officeId)) {
            continue // Skip invalid office
          }

          // Verify candidate exists for this office
          if (!candidatesByOffice[officeId]?.find(c => c.id === candidateId)) {
            continue // Skip invalid candidate
          }

          // Increment vote count
          if (tally[officeId] && tally[officeId][candidateId] !== undefined) {
            tally[officeId][candidateId]++
          }
        }

        validVotes++
      } catch (error: any) {
        // Failed to decrypt or parse vote
        invalidVotes++
        invalidVoteIds.push(vote.id)
        console.error(`Failed to process vote ${vote.id}:`, error.message)
      }
    }

    // 9. Calculate percentages and prepare results for storage
    const resultsToInsert: Array<{
      election: string
      office: string
      candidate: string
      voteCount: number
      percentage: string
      calculatedAt: Date
      calculatedBy: string
    }> = []

    for (const office of electionOffices) {
      const officeTally = tally[office.id]
      const totalOfficeVotes = Object.values(officeTally).reduce((sum, count) => sum + count, 0)

      for (const candidate of candidatesByOffice[office.id]) {
        const voteCount = officeTally[candidate.id] || 0
        const percentage = totalOfficeVotes > 0 
          ? ((voteCount / totalOfficeVotes) * 100).toFixed(2)
          : '0.00'

        resultsToInsert.push({
          election: electionId,
          office: office.id,
          candidate: candidate.id,
          voteCount,
          percentage,
          calculatedAt: new Date(),
          calculatedBy,
        })
      }
    }

    // 10. Delete existing results for this election (if recalculating)
    await db
      .delete(results)
      .where(eq(results.election, electionId))

    // 11. Insert new results
    if (resultsToInsert.length > 0) {
      await db.insert(results).values(resultsToInsert)
    }

    // 12. Return summary
    return {
      electionId,
      totalVotes: allVotes.length,
      validVotes,
      invalidVotes,
      invalidVoteIds,
      officesCount: electionOffices.length,
      resultsCount: resultsToInsert.length,
      calculatedAt: new Date(),
      calculatedBy,
    }
  }

  /**
   * Get stored results for an election
   * 
   * @param electionId - The election ID
   * @returns Results grouped by office with candidate vote counts
   */
  async getResults(electionId: string) {
    // Verify election exists
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // Get all results for this election with candidate and voter info
    const electionResults = await db
      .select({
        result: results,
        office: offices,
        candidate: candidates,
        voter: voters,
      })
      .from(results)
      .innerJoin(offices, eq(results.office, offices.id))
      .innerJoin(candidates, eq(results.candidate, candidates.id))
      .innerJoin(voters, eq(candidates.voterId, voters.id))
      .where(eq(results.election, electionId))
      .orderBy(offices.name, desc(results.voteCount))

    if (electionResults.length === 0) {
      return {
        electionId,
        electionName: election.name,
        hasResults: false,
        message: 'Results have not been calculated yet',
        offices: [],
      }
    }

    // Group results by office
    const officesMap: Record<string, {
      officeId: string
      officeName: string
      officeDescription: string
      candidates: Array<{
        candidateId: string
        candidateName: string
        voteCount: number
        percentage: number
        isWinner: boolean
      }>
      totalVotes: number
    }> = {}

    for (const row of electionResults) {
      const officeId = row.office.id
      
      if (!officesMap[officeId]) {
        officesMap[officeId] = {
          officeId,
          officeName: row.office.name,
          officeDescription: row.office.description,
          candidates: [],
          totalVotes: 0,
        }
      }

      // Get candidate name from voter (already joined in query)
      const candidateName = row.voter?.username || `Candidate ${row.candidate.id.substring(0, 8)}`

      officesMap[officeId].candidates.push({
        candidateId: row.candidate.id,
        candidateName,
        voteCount: row.result.voteCount,
        percentage: parseFloat(row.result.percentage),
        isWinner: false, // Will be set below
      })

      officesMap[officeId].totalVotes += row.result.voteCount
    }

    // Determine winners (candidates with highest vote count per office)
    const officesArray = Object.values(officesMap)
    for (const office of officesArray) {
      if (office.candidates.length === 0) continue

      // Sort candidates by vote count (descending)
      office.candidates.sort((a, b) => b.voteCount - a.voteCount)

      // Mark winner(s) - handle ties
      const maxVotes = office.candidates[0].voteCount
      for (const candidate of office.candidates) {
        if (candidate.voteCount === maxVotes && maxVotes > 0) {
          candidate.isWinner = true
        }
      }
    }

    return {
      electionId,
      electionName: election.name,
      hasResults: true,
      calculatedAt: electionResults[0]?.result.calculatedAt,
      calculatedBy: electionResults[0]?.result.calculatedBy,
      offices: officesArray,
    }
  }

  /**
   * Check if results have been calculated for an election
   */
  async hasResults(electionId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(results)
      .where(eq(results.election, electionId))
      .limit(1)

    return !!result
  }
}

export const resultService = new ResultService()

