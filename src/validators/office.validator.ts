import { z } from 'zod'

// Create office validation schema
export const createOfficeSchema = z.object({
  name: z.string().min(1, 'Office name is required'),
  description: z.string().min(1, 'Description is required'),
  election: z.string().uuid('Invalid election ID'),
  dependsOn: z.string().uuid('Invalid depends on office ID').optional().nullable(),
})

// Update office validation schema
export const updateOfficeSchema = z.object({
  name: z.string().min(1, 'Office name is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  election: z.string().uuid('Invalid election ID').optional(),
  dependsOn: z.string().uuid('Invalid depends on office ID').optional().nullable(),
})

// Get office by ID
export const officeIdSchema = z.object({
  id: z.string().uuid('Invalid office ID'),
})

// Get offices by election
export const getOfficesByElectionSchema = z.object({
  election: z.string().uuid('Invalid election ID'),
})

export type CreateOfficeInput = z.infer<typeof createOfficeSchema>
export type UpdateOfficeInput = z.infer<typeof updateOfficeSchema>

