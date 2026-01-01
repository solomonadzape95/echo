import { Context } from 'hono'
import { officeTemplateService } from '../services/office-template.service'
import { z } from 'zod'

const electionTypeSchema = z.enum(['class', 'department', 'faculty'])

export class OfficeTemplateController {
  /**
   * Get office templates by election type
   * GET /office-templates?type=class|department|faculty
   */
  async getByType(c: Context) {
    try {
      const typeParam = c.req.query('type')
      
      if (!typeParam) {
        return c.json({
          success: false,
          message: 'Election type is required. Use ?type=class|department|faculty',
        }, 400)
      }

      const typeResult = electionTypeSchema.safeParse(typeParam)
      if (!typeResult.success) {
        return c.json({
          success: false,
          message: 'Invalid election type. Must be one of: class, department, faculty',
          errors: typeResult.error.errors,
        }, 400)
      }

      const templates = officeTemplateService.getTemplatesByType(typeResult.data)

      return c.json({
        success: true,
        data: templates,
        message: `Found ${templates.length} office templates for ${typeResult.data} elections`,
      })
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch office templates',
      }, 500)
    }
  }

  /**
   * Get all office templates
   * GET /office-templates
   */
  async getAll(c: Context) {
    try {
      const templates = officeTemplateService.getAllTemplates()

      return c.json({
        success: true,
        data: templates,
        message: 'Office templates retrieved successfully',
      })
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch office templates',
      }, 500)
    }
  }
}

export const officeTemplateController = new OfficeTemplateController()

