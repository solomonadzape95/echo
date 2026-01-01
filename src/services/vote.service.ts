import { eq, desc, sql } from 'drizzle-orm'
import { db, generateReceiptCode } from '../db/db'
import { votes } from '../models/vote.schema'
import { elections } from '../models/election.schema'
import { tokens } from '../models/token.schema'
import { receipts } from '../models/receipt.schema'
import type { CreateVoteInput } from '../validators/vote.validator'
import { GENESIS_HASH } from '../validators/vote.validator'
import { voteEncryptionService } from './voteEncryption.service'
import { checkEligibilityByDomain } from '../helpers/eligibility.helpers'
import crypto from 'crypto'

export class VoteService {
  /**
   * Create a new vote atomically (handles genesis vote automatically)
   * This is an atomic transaction that:
   * 1. Verifies eligibility (issuance exists)
   * 2. Verifies token (valid, unused, belongs to election)
   * 3. Creates vote with voteDataHash
   * 4. Marks token as used
   * 5. Creates receipt with short code
   */
  async create(input: CreateVoteInput, voterId: string) {
    return await db.transaction(async (tx) => {
      // 1. Verify election exists
      const [election] = await tx
        .select()
        .from(elections)
        .where(eq(elections.id, input.election))
        .limit(1)

      if (!election) {
        throw new Error('Election not found')
      }

      // 2. Verify eligibility by domain matching (class/department/faculty)
      const eligibility = await checkEligibilityByDomain(voterId, input.election)
      
      if (!eligibility.eligible) {
        throw new Error(`Voter is not eligible to vote in this election: ${eligibility.reason || 'Domain mismatch'}`)
      }

      // 3. Verify token exists and is not used
      const [token] = await tx
        .select()
        .from(tokens)
        .where(eq(tokens.tokenHash, input.tokenId))
        .limit(1)

      if (!token) {
        throw new Error('Token not found')
      }

      if (token.usedAt) {
        throw new Error('Token has already been used')
      }

      // 4. Verify token belongs to the election
      if (token.election !== input.election) {
        throw new Error('Token does not belong to this election')
      }

      // 5. Determine prevHash: check if this is the genesis vote (first vote for this election)
      // Use SELECT FOR UPDATE to lock rows and prevent race conditions when multiple votes are created simultaneously
      let prevHash: string

      if (input.prevHash) {
        // If prevHash is provided, validate it matches the last vote
        const lastVote = await this.getLastVoteForElectionInTx(tx, input.election)
        if (lastVote && lastVote.currentHash !== input.prevHash) {
          throw new Error('Previous hash does not match the last vote in the chain')
        }
        prevHash = input.prevHash
      } else {
        // Auto-determine: get the last vote with lock to prevent race conditions
        // Lock all votes for this election to prevent concurrent inserts
        const lastVote = await this.getLastVoteForElectionInTxWithLock(tx, input.election)
        
        if (!lastVote) {
          // No votes exist yet - this should be the genesis vote
          // Double-check after lock to ensure no vote was created between check and lock
          const doubleCheck = await this.getLastVoteForElectionInTx(tx, input.election)
          if (!doubleCheck) {
            prevHash = GENESIS_HASH
          } else {
            // A vote was created between our checks, use its currentHash
            prevHash = doubleCheck.currentHash
          }
        } else {
          // Use the last vote's currentHash as prevHash
          prevHash = lastVote.currentHash
        }
      }

      // 6. Encrypt vote data if provided, otherwise use voteDataHash
      let encryptedVoteData: string | null = null
      
      if (input.voteData) {
        // Encrypt the vote data (candidate selections)
        encryptedVoteData = voteEncryptionService.encryptVoteData(input.voteData)
        
        // Verify the hash matches (client should send the hash of the vote data)
        const voteDataString = JSON.stringify(input.voteData)
        const computedHash = crypto.createHash('sha256').update(voteDataString).digest('hex')
        
        if (computedHash !== input.voteDataHash) {
          throw new Error('Vote data hash does not match the provided vote data')
        }
      }

      // 7. Create vote with voteDataHash and encrypted vote data
      const [newVote] = await tx
        .insert(votes)
        .values({
          prevHash,
          currentHash: input.currentHash,
          voteDataHash: input.voteDataHash, // Hash of ballot data (candidate selection)
          encryptedVoteData, // Encrypted vote data (if provided)
          tokenId: input.tokenId,
          election: input.election,
        })
        .returning()

      if (!newVote) {
        throw new Error('Failed to create vote')
      }

      // 7. Mark token as used
      await tx
        .update(tokens)
        .set({ usedAt: new Date() })
        .where(eq(tokens.id, token.id))

      // 8. Generate receipt code and create receipt
      let receiptCode: string
      let attempts = 0
      const maxAttempts = 10

      // Ensure receipt code is unique
      do {
        receiptCode = generateReceiptCode()
        const [existing] = await tx
          .select()
          .from(receipts)
          .where(eq(receipts.receiptCode, receiptCode))
          .limit(1)
        
        if (!existing) {
          break
        }
        attempts++
        if (attempts >= maxAttempts) {
          throw new Error('Failed to generate unique receipt code')
        }
      } while (true)

      const [newReceipt] = await tx
        .insert(receipts)
        .values({
          receiptCode,
          election: input.election,
          voteId: newVote.id,
        })
        .returning()

      if (!newReceipt) {
        throw new Error('Failed to create receipt')
      }

      // Return vote and receipt
      return {
        vote: newVote,
        receipt: newReceipt,
      }
    })
  }

  /**
   * Get the last vote for an election (for chain linking) - transaction version
   */
  private async getLastVoteForElectionInTx(tx: any, electionId: string) {
    const [lastVote] = await tx
      .select()
      .from(votes)
      .where(eq(votes.election, electionId))
      .orderBy(desc(votes.createdAt))
      .limit(1)

    return lastVote || null
  }

  /**
   * Get the last vote for an election with FOR UPDATE lock to prevent race conditions
   * This ensures only one transaction can read the last vote at a time
   */
  private async getLastVoteForElectionInTxWithLock(tx: any, electionId: string) {
    // Use raw SQL with FOR UPDATE to lock the row
    // This prevents race conditions when multiple votes are created simultaneously
    const result = await tx.execute(sql`
      SELECT id, prev_hash, current_hash, vote_data_hash, encrypted_vote_data, token_id, election, created_at, updated_at
      FROM votes
      WHERE election = ${electionId}
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    `)

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0]
      return {
        id: row.id,
        prevHash: row.prev_hash,
        currentHash: row.current_hash,
        voteDataHash: row.vote_data_hash,
        encryptedVoteData: row.encrypted_vote_data,
        tokenId: row.token_id,
        election: row.election,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    }

    return null
  }

  /**
   * Get the last vote for an election (for chain linking) - non-transaction version
   */
  private async getLastVoteForElection(electionId: string) {
    const [lastVote] = await db
      .select()
      .from(votes)
      .where(eq(votes.election, electionId))
      .orderBy(desc(votes.createdAt))
      .limit(1)

    return lastVote || null
  }

  /**
   * Get all votes
   */
  async getAll() {
    return await db.select().from(votes)
  }

  /**
   * Get vote by ID
   */
  async getById(id: string) {
    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.id, id))
      .limit(1)

    if (!vote) {
      throw new Error('Vote not found')
    }

    return vote
  }

  /**
   * Get votes by election
   */
  async getByElection(electionId: string) {
    return await db
      .select()
      .from(votes)
      .where(eq(votes.election, electionId))
      .orderBy(desc(votes.createdAt))
  }

  /**
   * Get votes by token
   */
  async getByToken(tokenId: string) {
    return await db
      .select()
      .from(votes)
      .where(eq(votes.tokenId, tokenId))
  }

  /**
   * Verify vote chain integrity for an election
   */
  async verifyChain(electionId: string) {
    const electionVotes = await this.getByElection(electionId)
    
    if (electionVotes.length === 0) {
      return { valid: true, message: 'No votes to verify' }
    }

    // getByElection returns votes in descending order (newest first)
    // Reverse to get chronological order (oldest first) for chain verification
    const votesInOrder = [...electionVotes].reverse()

    // Check if first vote has genesis hash
    const firstVote = votesInOrder[0] // First vote (oldest)
    if (firstVote.prevHash !== GENESIS_HASH) {
      return { 
        valid: false, 
        message: 'First vote does not have genesis hash',
        voteId: firstVote.id,
        expectedPrevHash: GENESIS_HASH,
        actualPrevHash: firstVote.prevHash,
      }
    }

    // Verify chain links (going forward in time)
    for (let i = 1; i < votesInOrder.length; i++) {
      const currentVote = votesInOrder[i] // Current vote (newer)
      const previousVote = votesInOrder[i - 1] // Previous vote (older)
      
      // Current vote's prevHash should match previous vote's currentHash
      if (currentVote.prevHash !== previousVote.currentHash) {
        return {
          valid: false,
          message: 'Vote chain broken',
          voteId: currentVote.id,
          expectedPrevHash: previousVote.currentHash,
          actualPrevHash: currentVote.prevHash,
        }
      }
    }

    return { valid: true, message: 'Vote chain is valid', voteCount: electionVotes.length }
  }
}

export const voteService = new VoteService()

