import { z } from 'zod'

export const createClassSchema = z.object({
    level: z.string().min(1, 'Level is required'),
    facultyId: z.string().uuid('Invalid faculty ID'),
    departmentId: z.string().uuid('Invalid department ID'),
})

export const updateClassSchema = z.object({
    level: z.string().min(1, 'Level is required'),
    facultyId: z.string().uuid('Invalid faculty ID'),
    departmentId: z.string().uuid('Invalid department ID'),
})

export const getClassSchema = z.object({
    id: z.string().uuid('Invalid class ID'),
})

export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
export type GetClassInput = z.infer<typeof getClassSchema>