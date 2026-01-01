import { z } from 'zod'

// Create token validation schema
export const createTokenSchema = z.object({
  election: z.string().uuid('Invalid election ID'),
  tokenHash: z.string().min(1, 'Token hash is required'),
})

// Update token validation schema (mark as used)
export const updateTokenSchema = z.object({
  usedAt: z.date().optional(),
})

// Get token by ID
export const tokenIdSchema = z.object({
  id: z.string().uuid('Invalid token ID'),
})

// Get tokens by election
export const getTokensByElectionSchema = z.object({
  election: z.string().uuid('Invalid election ID'),
})

export type CreateTokenInput = z.infer<typeof createTokenSchema>
export type UpdateTokenInput = z.infer<typeof updateTokenSchema>

