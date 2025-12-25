import { Context } from 'hono'
import { facultyService } from '../services/faculty.service'
import { createFacultySchema, updateFacultySchema, getFacultySchema } from '../validators/faculty.validator'

export class FacultyController {
    /**
     * Create a new faculty
     */
    async create(c: Context) {
        try {
            const body = await c.req.json()
            const validatedData = createFacultySchema.parse(body)

            const faculty = await facultyService.create(validatedData)

            return c.json({
                success: true,
                data: faculty,
                message: 'Faculty created successfully',
            }, 201)
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return c.json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors,
                }, 400)
            }

            return c.json({
                success: false,
                message: error.message || 'Failed to create faculty',
            }, 400)
        }
    }

    /**
     * Get all faculties
     */
    async getAll(c: Context) {
        try {
            const faculties = await facultyService.getAll()

            return c.json({
                success: true,
                data: faculties,
            }, 200)
        } catch (error: any) {
            return c.json({
                success: false,
                message: error.message || 'Failed to fetch faculties',
            }, 500)
        }
    }

    /**
     * Get faculty by ID
     */
    async getById(c: Context) {
        try {
            const id = c.req.param('id')
            const validatedId = getFacultySchema.parse({ id })

            const faculty = await facultyService.getById(validatedId)

            return c.json({
                success: true,
                data: faculty,
            }, 200)
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return c.json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors,
                }, 400)
            }

            return c.json({
                success: false,
                message: error.message || 'Failed to fetch faculty',
            }, error.message === 'Faculty not found' ? 404 : 500)
        }
    }

    /**
     * Update faculty
     */
    async update(c: Context) {
        try {
            const id = c.req.param('id')
            const validatedId = getFacultySchema.parse({ id })
            const body = await c.req.json()
            const validatedData = updateFacultySchema.parse(body)

            const faculty = await facultyService.update(validatedId.id, validatedData)

            return c.json({
                success: true,
                data: faculty,
                message: 'Faculty updated successfully',
            }, 200)
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return c.json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors,
                }, 400)
            }

            return c.json({
                success: false,
                message: error.message || 'Failed to update faculty',
            }, error.message === 'Faculty not found' ? 404 : 400)
        }
    }

    /**
     * Delete faculty
     */
    async delete(c: Context) {
        try {
            const id = c.req.param('id')
            const validatedId = getFacultySchema.parse({ id })

            await facultyService.delete(validatedId.id)

            return c.json({
                success: true,
                message: 'Faculty deleted successfully',
            }, 200)
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return c.json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors,
                }, 400)
            }

            return c.json({
                success: false,
                message: error.message || 'Failed to delete faculty',
            }, error.message === 'Faculty not found' ? 404 : 500)
        }
    }
}

export const facultyController = new FacultyController()

