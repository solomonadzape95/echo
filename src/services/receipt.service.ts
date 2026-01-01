import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { receipts } from '../models/receipt.schema'
import { elections } from '../models/election.schema'
import { votes } from '../models/vote.schema'
import type { CreateReceiptInput } from '../validators/receipt.validator'

export class ReceiptService {
  /**
   * Create a new receipt
   */
  async create(input: CreateReceiptInput) {
    // Verify election exists
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, input.election))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // Check if receipt hash already exists (should be unique per election)
    const [existing] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.receiptHash, input.receiptHash))
      .limit(1)

    if (existing) {
      throw new Error('Receipt hash already exists')
    }

    // Create receipt
    const [newReceipt] = await db
      .insert(receipts)
      .values({
        receiptHash: input.receiptHash,
        election: input.election,
      })
      .returning()

    if (!newReceipt) {
      throw new Error('Failed to create receipt')
    }

    return newReceipt
  }

  /**
   * Get all receipts
   */
  async getAll() {
    return await db.select().from(receipts)
  }

  /**
   * Get receipts by election
   */
  async getByElection(electionId: string) {
    return await db
      .select()
      .from(receipts)
      .where(eq(receipts.election, electionId))
  }

  /**
   * Get receipt by code with vote and election details
   */
  async getByCodeWithDetails(receiptCode: string) {
    const [receipt] = await db
      .select({
        receiptId: receipts.id,
        receiptCode: receipts.receiptCode,
        receiptCreatedAt: receipts.createdAt,
        voteId: votes.id,
        voteCurrentHash: votes.currentHash,
        votePrevHash: votes.prevHash,
        voteDataHash: votes.voteDataHash,
        voteCreatedAt: votes.createdAt,
        electionId: elections.id,
        electionName: elections.name,
        electionDescription: elections.description,
        electionType: elections.type,
        electionStatus: elections.status,
        electionStartDate: elections.startDate,
        electionEndDate: elections.endDate,
      })
      .from(receipts)
      .innerJoin(votes, eq(receipts.voteId, votes.id))
      .innerJoin(elections, eq(receipts.election, elections.id))
      .where(eq(receipts.receiptCode, receiptCode))
      .limit(1)

    if (!receipt) {
      return null
    }

    return {
      receipt: {
        id: receipt.receiptId,
        code: receipt.receiptCode,
        createdAt: receipt.receiptCreatedAt,
      },
      vote: {
        id: receipt.voteId,
        currentHash: receipt.voteCurrentHash,
        prevHash: receipt.votePrevHash,
        voteDataHash: receipt.voteDataHash,
        createdAt: receipt.voteCreatedAt,
      },
      election: {
        id: receipt.electionId,
        name: receipt.electionName,
        description: receipt.electionDescription,
        type: receipt.electionType,
        status: receipt.electionStatus,
        startDate: receipt.electionStartDate,
        endDate: receipt.electionEndDate,
      },
    }
  }
}

export const receiptService = new ReceiptService()

