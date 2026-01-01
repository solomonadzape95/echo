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
      const regNumber = c.req.query('regNumber')

      const entries = await masterlistService.getAll({
        classId: classId || undefined,
        activated: activated === 'true' ? true : activated === 'false' ? false : undefined,
        regNumber: regNumber || undefined,
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
   * Verify registration number (public endpoint)
   * GET /masterlist/verify?regNumber=xxx
   */
  async verify(c: Context) {
    try {
      console.log('[MASTERLIST VERIFY] Request received')
      const regNumber = c.req.query('regNumber')
      console.log('[MASTERLIST VERIFY] regNumber from query:', regNumber)

      if (!regNumber) {
        console.log('[MASTERLIST VERIFY] Missing regNumber parameter')
        return c.json({
          success: false,
          message: 'regNumber query parameter is required',
        }, 400)
      }

      console.log('[MASTERLIST VERIFY] Calling service with regNumber:', regNumber)
      const record = await masterlistService.getByRegNoWithRelations(regNumber)
      console.log('[MASTERLIST VERIFY] Service returned:', record ? 'Found record' : 'No record found')

      if (!record) {
        console.log('[MASTERLIST VERIFY] Record not found for regNumber:', regNumber)
        return c.json({
          success: false,
          message: 'Registration number not found in masterlist',
        }, 404)
      }

      // Check if account is already activated
      if (record.activated) {
        console.log('[MASTERLIST VERIFY] Record found but already activated')
        return c.json({
          success: false,
          message: 'An account already exists for this registration number',
          data: record, // Still return the data so frontend can show name/class
          alreadyExists: true,
        }, 200)
      }

      console.log('[MASTERLIST VERIFY] Returning success response')
      return c.json({
        success: true,
        data: record,
      }, 200)
    } catch (error: any) {
      console.error('[MASTERLIST VERIFY] Error:', error)
      console.error('[MASTERLIST VERIFY] Error stack:', error.stack)
      return c.json({
        success: false,
        message: error.message || 'Failed to verify registration number',
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

