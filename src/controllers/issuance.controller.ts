import { Context } from 'hono'
import { issuanceService } from '../services/issuance.service'
import { createIssuanceSchema, issuanceIdSchema } from '../validators/issuance.validator'

export class IssuanceController {
  /**
   * Create a new issuance
   */
  async create(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = createIssuanceSchema.parse(body)

      const issuance = await issuanceService.create(validatedData)

      return c.json({
        success: true,
        data: issuance,
        message: 'Issuance created successfully',
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
        message: error.message || 'Failed to create issuance',
      }, 400)
    }
  }

  /**
   * Get all issuances
   */
  async getAll(c: Context) {
    try {
      const issuances = await issuanceService.getAll()

      return c.json({
        success: true,
        data: issuances,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch issuances',
      }, 500)
    }
  }

  /**
   * Get issuance by ID
   */
  async getOne(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = issuanceIdSchema.parse({ id })

      const issuance = await issuanceService.getById(validatedId.id)

      return c.json({
        success: true,
        data: issuance,
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
        message: error.message || 'Failed to fetch issuance',
      }, error.message === 'Issuance not found' ? 404 : 500)
    }
  }
}

export const issuanceController = new IssuanceController()

