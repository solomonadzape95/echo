import { z } from 'zod'
import { FacultyEnum, DepartmentEnum } from '../types/faculty.types'

export const createClassSchema = z.object({
    level: z.string().min(1, 'Level is required'),
    faculty: z.enum(Object.values(FacultyEnum) as [string, ...string[]], {
        errorMap: () => ({ message: 'Invalid faculty name' })
    }),
    department: z.enum(Object.values(DepartmentEnum) as [string, ...string[]], {
        errorMap: () => ({ message: 'Invalid department name' })
    }),
})

export const updateClassSchema = z.object({
    level: z.string().min(1, 'Level is required').optional(),
    faculty: z.enum(Object.values(FacultyEnum) as [string, ...string[]], {
        errorMap: () => ({ message: 'Invalid faculty name' })
    }).optional(),
    department: z.enum(Object.values(DepartmentEnum) as [string, ...string[]], {
        errorMap: () => ({ message: 'Invalid department name' })
    }).optional(),
})

export const getClassSchema = z.object({
    id: z.string().uuid('Invalid class ID'),
})

export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
export type GetClassInput = z.infer<typeof getClassSchema>