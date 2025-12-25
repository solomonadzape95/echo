import { z } from 'zod'

// Create issuance validation schema
export const createIssuanceSchema = z.object({
  electionId: z.string().uuid('Invalid election ID'),
  voterId: z.string().uuid('Invalid voter ID'),
})

// Get issuance by ID
export const issuanceIdSchema = z.object({
  id: z.string().uuid('Invalid issuance ID'),
})

export type CreateIssuanceInput = z.infer<typeof createIssuanceSchema>

