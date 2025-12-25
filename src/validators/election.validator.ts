import { z } from 'zod'

// Election type enum
const electionTypeEnum = z.enum(['class', 'department', 'faculty'])

// Election status enum
const electionStatusEnum = z.enum(['pending', 'active', 'completed'])

// Create election validation schema
export const createElectionSchema = z.object({
  name: z.string().min(1, 'Election name is required'),
  type: electionTypeEnum,
  status: electionStatusEnum.optional().default('pending'),
  startDate: z.string().datetime('Invalid start date format').or(z.date()),
  endDate: z.string().datetime('Invalid end date format').or(z.date()),
  description: z.string().min(1, 'Description is required'),
  domainId: z.string().uuid('Invalid domain ID'),
}).refine(
  (data) => {
    const start = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate
    const end = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate
    return end > start
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
)

// Update election validation schema
export const updateElectionSchema = z.object({
  name: z.string().min(1, 'Election name is required').optional(),
  type: electionTypeEnum.optional(),
  status: electionStatusEnum.optional(),
  startDate: z.string().datetime('Invalid start date format').or(z.date()).optional(),
  endDate: z.string().datetime('Invalid end date format').or(z.date()).optional(),
  description: z.string().min(1, 'Description is required').optional(),
  domainId: z.string().uuid('Invalid domain ID').optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      const start = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate
      const end = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate
      return end > start
    }
    return true
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
)

// Get election by ID
export const electionIdSchema = z.object({
  id: z.string().uuid('Invalid election ID'),
})

// Get elections by type
export const getElectionsByTypeSchema = z.object({
  type: electionTypeEnum,
})

// Get elections by status
export const getElectionsByStatusSchema = z.object({
  status: electionStatusEnum,
})

export type CreateElectionInput = z.infer<typeof createElectionSchema>
export type UpdateElectionInput = z.infer<typeof updateElectionSchema>

