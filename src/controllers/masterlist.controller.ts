import { Context } from 'hono'
import { z } from 'zod'
import { masterlistService } from '../services/masterlist.service'
import { parseMasterlistCsv } from '../helpers/csv.helpers'
import {
  buildPaginationMeta,
  parsePagination,
} from '../helpers/pagination.helpers'

const studentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  regNo: z.string().trim().min(1, 'Registration number is required').max(255),
})

const uploadMasterlistSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  students: z.array(studentSchema).min(1, 'At least one student is required'),
})

const studentIdSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
})

export class MasterlistController {
  /**
   * Upload a masterlist.
   *
   * POST /admin/masterlist/upload
   * - JSON:    { classId, students: [{ name, regNo }] }
   * - multipart: file=<csv> + classId=<uuid>
   */
  async upload(c: Context) {
    try {
      const contentType = c.req.header('content-type') ?? ''

      let classId: string
      let students: Array<{ name: string; regNo: string }>

      if (contentType.includes('multipart/form-data')) {
        const body = await c.req.parseBody()
        const rawClassId = body['classId']
        const file = body['file']

        if (typeof rawClassId !== 'string' || !rawClassId) {
          return c.json({ success: false, message: 'classId is required' }, 400)
        }

        if (!(file instanceof File)) {
          return c.json({ success: false, message: 'A CSV file is required' }, 400)
        }

        if (file.size > 5 * 1024 * 1024) {
          return c.json({ success: false, message: 'The CSV file must be smaller than 5 MB' }, 400)
        }

        const text = await file.text()
        const parsed = parseMasterlistCsv(text)

        if (parsed.errors.length > 0) {
          return c.json({
            success: false,
            message: 'The CSV file could not be imported',
            errors: parsed.errors,
          }, 400)
        }

        classId = rawClassId
        students = parsed.students
      } else {
        const body = await c.req.json()
        const validated = uploadMasterlistSchema.parse(body)
        classId = validated.classId
        students = validated.students
      }

      const validated = uploadMasterlistSchema.parse({ classId, students })
      const result = await masterlistService.uploadMasterlist(
        validated.classId,
        validated.students
      )

      const summary = [
        `${result.created} created`,
        `${result.updated} updated`,
        result.unchanged > 0 ? `${result.unchanged} unchanged` : null,
        result.errors.length > 0 ? `${result.errors.length} skipped` : null,
      ].filter(Boolean).join(', ')

      return c.json({
        success: true,
        data: result,
        message: `Masterlist uploaded: ${summary}`,
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
   * Get masterlist entries.
   *
   * GET /admin/masterlist?page=1&limit=20&search=&classId=&activated=
   */
  async getAll(c: Context) {
    try {
      const { page, limit } = parsePagination({
        page: c.req.query('page'),
        limit: c.req.query('limit'),
      })

      const activatedParam = c.req.query('activated')
      const activated = activatedParam === 'true'
        ? true
        : activatedParam === 'false'
          ? false
          : undefined

      const entries = await masterlistService.getAll({
        classId: c.req.query('classId') || undefined,
        activated,
        regNumber: c.req.query('regNumber') || undefined,
        search: c.req.query('search') || undefined,
        page,
        limit,
      })

      return c.json({
        success: true,
        data: entries.data,
        pagination: buildPaginationMeta(entries.total, page, limit),
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
      const regNumber = c.req.query('regNumber')

      if (!regNumber) {
        return c.json({
          success: false,
          message: 'regNumber query parameter is required',
        }, 400)
      }

      const record = await masterlistService.getByRegNoWithRelations(regNumber)

      if (!record) {
        return c.json({
          success: false,
          message: 'Registration number not found in masterlist',
        }, 404)
      }

      return c.json({
        success: true,
        data: record,
        message: record.hasAccount
          ? 'An account already exists for this registration number'
          : undefined,
      }, 200)
    } catch (error: any) {
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
    return this.setActivation(c, true)
  }

  /**
   * Deactivate a student
   * POST /admin/masterlist/deactivate
   */
  async deactivate(c: Context) {
    return this.setActivation(c, false)
  }

  private async setActivation(c: Context, activated: boolean) {
    try {
      const body = await c.req.json()
      const validated = studentIdSchema.parse(body)
      const student = await masterlistService.setActivation(validated.studentId, activated)

      return c.json({
        success: true,
        data: student,
        message: activated
          ? 'Student activated successfully'
          : 'Student deactivated successfully',
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
        message: error.message || 'Failed to update student',
      }, 400)
    }
  }

  /**
   * Activate every pending student, optionally for one class.
   * POST /admin/masterlist/activate-all
   */
  async activateAll(c: Context) {
    try {
      const body = await c.req.json().catch(() => ({}))
      const parsed = z
        .object({ classId: z.string().uuid('Invalid class ID').optional() })
        .safeParse(body)

      if (!parsed.success) {
        return c.json({
          success: false,
          message: 'Invalid class ID',
        }, 400)
      }

      const result = await masterlistService.activateAll(parsed.data.classId)

      return c.json({
        success: true,
        data: result,
        message: `${result.activated} masterlist entr${result.activated === 1 ? 'y' : 'ies'} activated`,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to activate masterlist entries',
      }, 400)
    }
  }

  /**
   * Remove a single masterlist entry.
   * DELETE /admin/masterlist/:id
   */
  async remove(c: Context) {
    try {
      const id = c.req.param('id')
      const parsed = z.string().uuid().safeParse(id)

      if (!parsed.success) {
        return c.json({ success: false, message: 'Invalid student ID' }, 400)
      }

      await masterlistService.deleteEntry(parsed.data)

      return c.json({
        success: true,
        message: 'Masterlist entry removed',
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to remove masterlist entry',
      }, 400)
    }
  }
}

export const masterlistController = new MasterlistController()
