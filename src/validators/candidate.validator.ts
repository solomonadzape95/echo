import { z } from 'zod'

// Create candidate validation schema
export const createCandidateSchema = z.object({
  officeId: z.string().uuid('Invalid office ID'),
  voterId: z.string().uuid('Invalid voter ID'),
  quote: z.string().optional(),
  manifesto: z.string().optional(),
  image: z.string().url('Invalid image URL').optional(),
})

// Update candidate validation schema
export const updateCandidateSchema = z.object({
  quote: z.string().optional(),
  manifesto: z.string().optional(),
  image: z.string().url('Invalid image URL').optional(),
})

// Get candidate by ID (just validates UUID)
export const candidateIdSchema = z.object({
  id: z.string().uuid('Invalid candidate ID'),
})

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>

