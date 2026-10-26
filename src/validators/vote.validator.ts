import { z } from 'zod'

// Genesis hash constant (zero hash for first vote)
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

// Create vote validation schema
// NOTE: currentHash / voteDataHash / prevHash are optional and ignored by the
// server. The server computes them itself so clients cannot forge chain links.
// `prepared` + `signature` are the RFC 9474 blind-signed token.
export const createVoteSchema = z.object({
  currentHash: z.string().min(1).optional(),
  voteDataHash: z.string().min(1).optional(),
  voteData: z.record(z.string(), z.string()).optional(), // Optional: raw vote data (officeId: candidateId) - encrypted server-side
  prepared: z.string().min(1, 'Prepared token is required'),
  signature: z.string().min(1, 'Token signature is required'),
  tokenId: z.string().min(1).optional(), // legacy
  election: z.string().uuid('Invalid election ID'),
  prevHash: z.string().optional(),
})

// Get vote by ID
export const voteIdSchema = z.object({
  id: z.string().uuid('Invalid vote ID'),
})

export type CreateVoteInput = z.infer<typeof createVoteSchema>

