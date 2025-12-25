import { Context } from 'hono'
import { departmentService } from '../services/department.service'
import { createDeptSchema, updateDeptSchema, getDeptSchema } from '../validators/department.validator'

export class DepartmentController {
    /**
     * Create a new department
     */
    async create(c: Context) {
        try {
            const body = await c.req.json()
            const validatedData = createDeptSchema.parse(body)

            const department = await departmentService.create(validatedData)

            return c.json({
                success: true,
                data: department,
                message: 'Department created successfully',
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
                message: error.message || 'Failed to create department',
            }, 400)
        }
    }

    /**
     * Get all departments
     */
    async getAll(c: Context) {
        try {
            const departments = await departmentService.getAll()

            return c.json({
                success: true,
                data: departments,
            }, 200)
        } catch (error: any) {
            return c.json({
                success: false,
                message: error.message || 'Failed to fetch departments',
            }, 500)
        }
    }

    /**
     * Get department by ID
     */
    async getById(c: Context) {
        try {
            const id = c.req.param('id')
            const validatedId = getDeptSchema.parse({ id })

            const department = await departmentService.getById(validatedId)

            return c.json({
                success: true,
                data: department,
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
                message: error.message || 'Failed to fetch department',
            }, error.message === 'Department not found' ? 404 : 500)
        }
    }

    /**
     * Get departments by faculty
     */
    async getByFaculty(c: Context) {
        try {
            const facultyId = c.req.query('facultyId')
            
            if (!facultyId) {
                return c.json({
                    success: false,
                    message: 'facultyId query parameter is required',
                }, 400)
            }

            const departments = await departmentService.getByFaculty(facultyId)

            return c.json({
                success: true,
                data: departments,
            }, 200)
        } catch (error: any) {
            return c.json({
                success: false,
                message: error.message || 'Failed to fetch departments',
            }, 500)
        }
    }

    /**
     * Update department
     */
    async update(c: Context) {
        try {
            const id = c.req.param('id')
            const validatedId = getDeptSchema.parse({ id })
            const body = await c.req.json()
            const validatedData = updateDeptSchema.parse(body)

            const department = await departmentService.update(validatedId.id, validatedData)

            return c.json({
                success: true,
                data: department,
                message: 'Department updated successfully',
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
                message: error.message || 'Failed to update department',
            }, error.message === 'Department not found' ? 404 : 400)
        }
    }

    /**
     * Delete department
     */
    async delete(c: Context) {
        try {
            const id = c.req.param('id')
            const validatedId = getDeptSchema.parse({ id })

            await departmentService.delete(validatedId.id)

            return c.json({
                success: true,
                message: 'Department deleted successfully',
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
                message: error.message || 'Failed to delete department',
            }, error.message === 'Department not found' ? 404 : 500)
        }
    }
}

export const departmentController = new DepartmentController()

