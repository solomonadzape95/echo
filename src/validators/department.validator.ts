import { z } from 'zod'
import { DepartmentEnum, type DepartmentName } from '../types/faculty.types'

// Create array of department names for Zod enum
const departmentNames = Object.values(DepartmentEnum) as [string, ...string[]]

export const createDeptSchema = z.object({
    name: z.enum(departmentNames).refine(
        value => departmentNames.includes(value as DepartmentName),
        { message: 'Invalid department name. Must be one of the predefined departments.' }
    ),
    facultyId: z.string().uuid("Invalid Faculty ID")
})


export const updateDeptSchema = z.object({
    name: z.enum(departmentNames).refine(
        value => departmentNames.includes(value as DepartmentName),
        { message: 'Invalid department name. Must be one of the predefined departments.' }
    ).optional(),
    facultyId: z.string().uuid("Invalid Faculty ID").optional()
})

export const getDeptSchema = z.object({
    id: z.string().uuid("Invalid Department ID")
})

export type CreateDeptInput = z.infer<typeof createDeptSchema>
export type UpdateDeptInput = z.infer<typeof updateDeptSchema>
export type GetDeptInput = z.infer<typeof getDeptSchema>