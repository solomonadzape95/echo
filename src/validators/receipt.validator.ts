import { z } from 'zod'

// Create receipt validation schema (used internally, not for API)
export const createReceiptSchema = z.object({
  receiptCode: z.string().min(1, 'Receipt code is required'),
  electionId: z.string().uuid('Invalid election ID'),
  voteId: z.string().uuid('Invalid vote ID'),
})

// Get receipt by ID
export const receiptIdSchema = z.object({
  id: z.string().uuid('Invalid receipt ID'),
})

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>

