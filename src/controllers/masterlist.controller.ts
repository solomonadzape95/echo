import { Context } from 'hono'
import { masterlistService } from '../services/masterlist.service'
import { z } from 'zod'

const uploadMasterlistSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  students: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    regNo: z.string().min(1, 'Registration number is required'),
  })).min(1, 'At least one student is required'),
})

const activateStudentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
})

export class MasterlistController {
  /**
   * Upload masterlist (CSV or JSON array of students)
   * POST /admin/masterlist/upload
   */
  async upload(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = uploadMasterlistSchema.parse(body)

      const result = await masterlistService.uploadMasterlist(
        validatedData.classId,
        validatedData.students
      )

      return c.json({
        success: true,
        data: {
          total: result.total,
          created: result.created,
          updated: result.updated,
          errors: result.errors,
        },
        message: `Masterlist uploaded: ${result.created} created, ${result.updated} updated`,
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
        message: error.message || 'Failed to upload masterlist',
      }, 400)
    }
  }

  /**
   * Get all masterlist entries
   * GET /admin/masterlist
   */
  async getAll(c: Context) {
    try {
      const classId = c.req.query('classId')
      const activated = c.req.query('activated')

      const entries = await masterlistService.getAll({
        classId: classId || undefined,
        activated: activated === 'true' ? true : activated === 'false' ? false : undefined,
      })

      return c.json({
        success: true,
        data: entries,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch masterlist',
      }, 500)
    }
  }

  /**
   * Activate a student (mark as activated)
   * POST /admin/masterlist/activate
   */
  async activate(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = activateStudentSchema.parse(body)

      const student = await masterlistService.activateStudent(validatedData.studentId)

      return c.json({
        success: true,
        data: student,
        message: 'Student activated successfully',
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
        message: error.message || 'Failed to activate student',
      }, 400)
    }
  }

  /**
   * Deactivate a student
   * POST /admin/masterlist/deactivate
   */
  async deactivate(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = activateStudentSchema.parse(body)

      const student = await masterlistService.deactivateStudent(validatedData.studentId)

      return c.json({
        success: true,
        data: student,
        message: 'Student deactivated successfully',
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
        message: error.message || 'Failed to deactivate student',
      }, 400)
    }
  }
}

export const masterlistController = new MasterlistController()

