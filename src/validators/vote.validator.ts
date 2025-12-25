import { z } from 'zod'

// Genesis hash constant (zero hash for first vote)
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

// Create vote validation schema
export const createVoteSchema = z.object({
  currentHash: z.string().min(1, 'Current hash is required'),
  voteDataHash: z.string().min(1, 'Vote data hash (hash of ballot/candidate selection) is required'),
  voteData: z.record(z.any()).optional(), // Optional: raw vote data (candidate selections) - will be encrypted server-side
  tokenId: z.string().min(1, 'Token ID is required'),
  electionId: z.string().uuid('Invalid election ID'),
  // prevHash is optional - will be set automatically (genesis or last vote's hash)
  prevHash: z.string().optional(),
})

// Get vote by ID
export const voteIdSchema = z.object({
  id: z.string().uuid('Invalid vote ID'),
})

export type CreateVoteInput = z.infer<typeof createVoteSchema>

