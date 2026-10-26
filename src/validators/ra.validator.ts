import { z } from 'zod'

// POST /ra/sign
export const raSignSchema = z.object({
  electionId: z.string().uuid('Invalid election ID'),
  blindedMsg: z.string().min(1, 'Blinded message is required'),
})

export type RASignInput = z.infer<typeof raSignSchema>
