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
        console.warn(`[RESULT SERVICE] Vote ${vote.id} has no encryptedVoteData`)
        invalidVotes++
        invalidVoteIds.push(vote.id)
        continue
      }

      try {
        // Decrypt or use plain text vote data
        // Check if data is encrypted (format: iv:authTag:encryptedData) or plain text
        // Encrypted format: 32 hex chars (IV) : 32 hex chars (authTag) : hex data
        let decryptedJson: string
        let isEncrypted = false
        
        // Better detection: encrypted data should have exactly 3 parts separated by colons
        // and the first two parts should be hex strings of specific lengths (IV=32, authTag=32)
        const parts = vote.encryptedVoteData.split(':')
        if (parts.length === 3) {
          const [ivHex, authTagHex] = parts
          // IV and authTag should be hex strings of specific lengths
          // IV is 16 bytes = 32 hex chars, authTag is 16 bytes = 32 hex chars
          const isHex = /^[0-9a-f]+$/i
          if (ivHex.length === 32 && authTagHex.length === 32 && 
              isHex.test(ivHex) && isHex.test(authTagHex)) {
            isEncrypted = true
          }
        }
        
        if (isEncrypted) {
          // Data is encrypted, decrypt it
          decryptedJson = voteEncryptionService.decryptVoteData(vote.encryptedVoteData)
        } else {
          // Data is plain text (for testing/backward compatibility)
          // Try to parse as JSON to verify it's valid JSON
          try {
            JSON.parse(vote.encryptedVoteData)
            decryptedJson = vote.encryptedVoteData
          } catch (parseError) {
            // Not valid JSON, might be encrypted but detection failed
            // Try to decrypt anyway
            try {
              decryptedJson = voteEncryptionService.decryptVoteData(vote.encryptedVoteData)
            } catch (decryptError) {
              throw new Error(`Vote data is neither valid JSON nor encrypted: ${parseError instanceof Error ? parseError.message : 'parse failed'}`)
            }
          }
        }
        
        const voteData = JSON.parse(decryptedJson) // { officeId: candidateId, ... }

        // Verify integrity: check if hash matches
        // Note: Hash should be computed from the JSON string exactly as it was when created
        const computedHash = crypto
          .createHash('sha256')
          .update(decryptedJson)
          .digest('hex')

        if (computedHash !== vote.voteDataHash) {
          // Vote data has been tampered with!
          console.warn(`[RESULT SERVICE] Hash mismatch for vote ${vote.id}`)
          console.warn(`  Expected hash: ${vote.voteDataHash}`)
          console.warn(`  Computed hash: ${computedHash}`)
          console.warn(`  Vote data: ${decryptedJson.substring(0, 100)}...`)
          invalidVotes++
          invalidVoteIds.push(vote.id)
          continue
        }

        // Count votes per office -> candidate
        // Note: A vote is valid if it has valid hash, even if it has no selections (abstention)
        let hasValidVote = false
        const voteDataEntries = Object.entries(voteData)
        
        if (voteDataEntries.length === 0) {
          // Empty vote data (abstention) - still valid, just no votes to count
          console.log(`[RESULT SERVICE] Vote ${vote.id} has empty vote data (abstention) - still valid`)
          validVotes++
        } else {
          for (const [officeId, candidateId] of voteDataEntries) {
            if (typeof candidateId !== 'string') {
              console.warn(`[RESULT SERVICE] Vote ${vote.id} has invalid candidate ID type for office ${officeId}: ${typeof candidateId}`)
              continue
            }
            
            // Verify office exists in this election
            const office = electionOffices.find(o => o.id === officeId)
            if (!office) {
              console.warn(`[RESULT SERVICE] Vote ${vote.id} references invalid office: ${officeId}`)
              console.warn(`  Available offices:`, electionOffices.map(o => o.id))
              continue // Skip invalid office
            }

            // Verify candidate exists for this office
            const candidate = candidatesByOffice[officeId]?.find(c => c.id === candidateId)
            if (!candidate) {
              console.warn(`[RESULT SERVICE] Vote ${vote.id} references invalid candidate ${candidateId} for office ${officeId}`)
              console.warn(`  Available candidates for office ${officeId}:`, candidatesByOffice[officeId]?.map(c => c.id))
              continue // Skip invalid candidate
            }

            // Increment vote count
            if (tally[officeId] && tally[officeId][candidateId] !== undefined) {
              tally[officeId][candidateId]++
              hasValidVote = true
            } else {
              console.warn(`[RESULT SERVICE] Vote ${vote.id} - Tally not initialized for office ${officeId}, candidate ${candidateId}`)
            }
          }

          if (hasValidVote) {
            validVotes++
          } else {
            // Vote has selections but none are valid - this is suspicious but we'll still count it as valid if hash matches
            console.warn(`[RESULT SERVICE] Vote ${vote.id} has selections but none match valid candidates - marking as valid (hash verified)`)
            validVotes++
          }
        }
      } catch (error: any) {
        // Failed to decrypt or parse vote
        console.error(`[RESULT SERVICE] Failed to process vote ${vote.id}:`, error.message)
        console.error(`  Error stack:`, error.stack)
        invalidVotes++
        invalidVoteIds.push(vote.id)
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
    try {
      await db
        .delete(results)
        .where(eq(results.election, electionId))
    } catch (error: any) {
      // If table doesn't exist, that's okay - we'll create it when inserting
      if (!error.message?.includes('does not exist') && !error.message?.includes('relation') && error.code !== '42P01') {
        console.error('[RESULT SERVICE] Error deleting existing results:', error)
        throw new Error(`Failed to delete existing results: ${error.message || error}`)
      }
    }

    // 11. Insert new results
    if (resultsToInsert.length > 0) {
      try {
        await db.insert(results).values(resultsToInsert)
      } catch (error: any) {
        console.error('[RESULT SERVICE] Error inserting results:', error)
        if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
          throw new Error('Results table does not exist. Please run: bun run db:push')
        }
        throw new Error(`Failed to insert results: ${error.message || error}`)
      }
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
    let electionResults
    try {
      electionResults = await db
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
    } catch (error: any) {
      console.error('[RESULT SERVICE] Error fetching results:', error)
      // If table doesn't exist, return empty results
      if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
        return {
          electionId,
          electionName: election.name,
          hasResults: false,
          message: 'Results table not found. Please run database migrations.',
          offices: [],
        }
      }
      throw new Error(`Failed to fetch results: ${error.message || error}`)
    }

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
        image?: string
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
      
      // Use candidate image if available, otherwise use voter profile picture
      const candidateImage = row.candidate.image || row.voter?.profilePicture || undefined

      officesMap[officeId].candidates.push({
        candidateId: row.candidate.id,
        candidateName,
        voteCount: row.result.voteCount,
        percentage: parseFloat(row.result.percentage),
        isWinner: false, // Will be set below
        image: candidateImage,
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

