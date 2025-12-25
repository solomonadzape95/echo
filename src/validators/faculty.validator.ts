import { z } from 'zod'
import { FacultyEnum, type FacultyName } from '../types/faculty.types'

// Create array of faculty names for Zod enum
const facultyNames = Object.values(FacultyEnum) as [string, ...string[]]

export const createFacultySchema = z.object({
    name: z.enum(facultyNames).refine(
        value => facultyNames.includes(value as FacultyName),
        { message: 'Invalid faculty name. Must be one of the predefined faculties.' }
    ),
})

export const updateFacultySchema = z.object({
    name: z.enum(facultyNames).refine(
        value => facultyNames.includes(value as FacultyName),
        { message: 'Invalid faculty name. Must be one of the predefined faculties.' }
    ).optional()
})

export const getFacultySchema = z.object({
    id: z.string().uuid("Invalid Faculty ID")
})

export type CreateFacultyInput = z.infer<typeof createFacultySchema>
export type UpdateFacultyInput = z.infer<typeof updateFacultySchema>
export type GetFacultyInput = z.infer<typeof getFacultySchema>