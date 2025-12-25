import { Context } from 'hono'
import { classService } from '../services/class.service'
import { createClassSchema, updateClassSchema, getClassSchema } from '../validators/class.validator'

export class ClassController {
    /**
     * Create a new class
     */
    async create(c: Context) {
        try {
            const body = await c.req.json()
            const validatedData = createClassSchema.parse(body)
            const classData = await classService.create(validatedData)
            return c.json({
                success: true,
                data: classData,
                message: 'Class created successfully',
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
                message: error.message || 'Failed to create class',
            }, 400)
        }
    }

    /**
     * Get a class by ID
     */
    async getById(c: Context) {
        try {
            const id = c.req.param('id')
            const validatedId = getClassSchema.parse({ id })
            const classData = await classService.getById(validatedId.id)
            return c.json({
                success: true,
                data: classData,
                message: 'Class fetched successfully',
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
                message: error.message || 'Failed to fetch class',
            }, error.message === 'Class not found' ? 404 : 500)
        }
    }
    /**
     * Get all classes
     */
    async getAll(c: Context) {
        try {
            const classesData = await classService.getAll()
            return c.json({
                success: true,
                data: classesData,
                message: 'Classes fetched successfully',
            }, 200)
        } catch (error: any) {
            return c.json({
                success: false,
                message: error.message || 'Failed to fetch classes',
            }, 500)
        }
    }
    /** 
     * update a class
     */
    async update(c: Context) {
        try {
            const id = c.req.param('id')
            const validatedId = getClassSchema.parse({ id })
            const body = await c.req.json()
            const validatedData = updateClassSchema.parse(body)
            const classData = await classService.update(validatedId.id, validatedData)
            return c.json({
                success: true,
                data: classData,
                message: 'Class updated successfully',
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
                message: error.message || 'Failed to update class',
            }, error.message === 'Class not found' ? 404 : 400)
        }
    }
    /**
     * Delete a class
     */
    async delete(c: Context) {
        try {
            const id = c.req.param('id')
            const validatedId = getClassSchema.parse({ id })
            const classData = await classService.delete(validatedId.id)
            return c.json({
                success: true,
                data: classData,
                message: 'Class deleted successfully',
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
                message: error.message || 'Failed to delete class',
            }, error.message === 'Class not found' ? 404 : 400)
        }
    }
}

export const classController = new ClassController()