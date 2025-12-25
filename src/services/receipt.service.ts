import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { receipts } from '../models/receipt.schema'
import { elections } from '../models/election.schema'
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
      .where(eq(elections.id, input.electionId))
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
        election: input.electionId,
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
}

export const receiptService = new ReceiptService()

