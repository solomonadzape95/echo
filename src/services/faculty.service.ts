import { db } from '../db/db'
import { eq } from 'drizzle-orm'
import { faculties } from '../models/faculty.schema'
import { CreateFacultyInput, UpdateFacultyInput, GetFacultyInput } from '../validators/faculty.validator'

export class FacultyService {
    /**
     * Create a new faculty
     */
    async create(input: CreateFacultyInput) {
        const { name } = input

        // Check if faculty already exists
        const [existingFaculty] = await db
            .select()
            .from(faculties)
            .where(eq(faculties.name, name))
            .limit(1)

        if (existingFaculty) {
            throw new Error('Faculty already exists')
        }

        const [newFaculty] = await db
            .insert(faculties)
            .values({ name })
            .returning()

        if (!newFaculty) {
            throw new Error('Failed to create faculty')
        }

        return newFaculty
    }

    /**
     * Get faculty by ID
     */
    async getById(input: GetFacultyInput) {
        const [faculty] = await db
            .select()
            .from(faculties)
            .where(eq(faculties.id, input.id))
            .limit(1)

        if (!faculty) {
            throw new Error('Faculty not found')
        }

        return faculty
    }

    /**
     * Get all faculties
     */
    async getAll() {
        return await db.select().from(faculties)
    }

    /**
     * Update faculty
     */
    async update(id: string, input: UpdateFacultyInput) {
        // Check if faculty exists
        const [existing] = await db
            .select()
            .from(faculties)
            .where(eq(faculties.id, id))
            .limit(1)

        if (!existing) {
            throw new Error('Faculty not found')
        }

        // If name is being updated, check for duplicates
        if (input.name && input.name !== existing.name) {
            const [duplicate] = await db
                .select()
                .from(faculties)
                .where(eq(faculties.name, input.name))
                .limit(1)

            if (duplicate) {
                throw new Error('Faculty name already exists')
            }
        }

        // Update faculty
        const updateData: any = {}
        if (input.name) updateData.name = input.name

        const [updated] = await db
            .update(faculties)
            .set(updateData)
            .where(eq(faculties.id, id))
            .returning()

        return updated
    }

    /**
     * Delete faculty
     */
    async delete(id: string) {
        // Check if faculty exists
        const [existing] = await db
            .select()
            .from(faculties)
            .where(eq(faculties.id, id))
            .limit(1)

        if (!existing) {
            throw new Error('Faculty not found')
        }

        // TODO: Check if faculty has departments before deleting
        // For now, we'll let the database foreign key constraint handle it

        await db
            .delete(faculties)
            .where(eq(faculties.id, id))

        return { success: true }
    }
}

export const facultyService = new FacultyService()