import { z } from 'zod'

// Calculate results validation schema
export const calculateResultsSchema = z.object({
  electionId: z.string().uuid('Invalid election ID'),
})

export type CalculateResultsInput = z.infer<typeof calculateResultsSchema>

