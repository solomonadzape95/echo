import { db } from '../db/db'
import { eq, not, and } from 'drizzle-orm'
import { departments } from '../models/department.schema'
import { faculties } from '../models/faculty.schema'
import { CreateDeptInput, UpdateDeptInput, GetDeptInput } from '../validators/department.validator'
import { isDepartmentInFaculty, type FacultyName, type DepartmentName } from '../types/faculty.types'

export class DepartmentService {
    /**
     * Create a new department
     */
    async create(input: CreateDeptInput) {
        const { name, facultyId } = input

        // Verify faculty exists
        const [faculty] = await db
            .select()
            .from(faculties)
            .where(eq(faculties.id, facultyId))
            .limit(1)

        if (!faculty) {
            throw new Error('Faculty not found')
        }

        // Validate that department belongs to the faculty
        if (!isDepartmentInFaculty(name as DepartmentName, faculty.name as FacultyName)) {
            throw new Error(`Department "${name}" does not belong to faculty "${faculty.name}"`)
        }

        // Check if department already exists for this faculty
        const [existingDept] = await db
            .select()
            .from(departments)
            .where(and(
                eq(departments.name, name),
                eq(departments.faculty, facultyId)
            ))
            .limit(1)

        if (existingDept) {
            throw new Error('Department already exists for this faculty')
        }

        // Create department
        const [newDepartment] = await db
            .insert(departments)
            .values({
                name,
                faculty: facultyId,
            })
            .returning()

        if (!newDepartment) {
            throw new Error('Failed to create department')
        }

        return newDepartment
    }

    /**
     * Get department by ID
     */
    async getById(input: GetDeptInput) {
        const [department] = await db
            .select()
            .from(departments)
            .where(eq(departments.id, input.id))
            .limit(1)

        if (!department) {
            throw new Error('Department not found')
        }

        return department
    }

    /**
     * Get all departments
     */
    async getAll() {
        return await db.select().from(departments)
    }

    /**
     * Get departments by faculty
     */
    async getByFaculty(facultyId: string) {
        return await db
            .select()
            .from(departments)
            .where(eq(departments.faculty, facultyId))
    }

    /**
     * Update department
     */
    async update(id: string, input: UpdateDeptInput) {
        // Check if department exists
        const [existing] = await db
            .select()
            .from(departments)
            .where(eq(departments.id, id))
            .limit(1)

        if (!existing) {
            throw new Error('Department not found')
        }

        // Determine which faculty to validate against
        const facultyId = input.facultyId || existing.faculty
        const [faculty] = await db
            .select()
            .from(faculties)
            .where(eq(faculties.id, facultyId))
            .limit(1)

        if (!faculty) {
            throw new Error('Faculty not found')
        }

        // If name is being updated, validate it belongs to the faculty
        if (input.name && input.name !== existing.name) {
            if (!isDepartmentInFaculty(input.name as DepartmentName, faculty.name as FacultyName)) {
                throw new Error(`Department "${input.name}" does not belong to faculty "${faculty.name}"`)
            }
        }

        // Check for duplicates if name or faculty is changing
        if (input.name || input.facultyId) {
            const [duplicate] = await db
                .select()
                .from(departments)
                .where(and(
                    eq(departments.name, input.name || existing.name),
                    eq(departments.faculty, facultyId),
                    not(eq(departments.id, id)) // Exclude current department
                ))
                .limit(1)

            if (duplicate) {
                throw new Error('Department already exists for this faculty')
            }
        }

        // Update department
        const updateData: any = {}
        if (input.name) updateData.name = input.name
        if (input.facultyId) updateData.faculty = input.facultyId

        const [updated] = await db
            .update(departments)
            .set(updateData)
            .where(eq(departments.id, id))
            .returning()

        return updated
    }

    /**
     * Delete department
     */
    async delete(id: string) {
        const [existing] = await db
            .select()
            .from(departments)
            .where(eq(departments.id, id))
            .limit(1)

        if (!existing) {
            throw new Error('Department not found')
        }

        await db
            .delete(departments)
            .where(eq(departments.id, id))

        return { success: true }
    }
}

export const departmentService = new DepartmentService()

