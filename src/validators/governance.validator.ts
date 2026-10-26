import { z } from 'zod'

export const createProposalSchema = z.object({
  electionId: z.string().uuid('Invalid election ID'),
  action: z.enum(['activate', 'close', 'publish_results']),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export type CreateProposalInput = z.infer<typeof createProposalSchema>
