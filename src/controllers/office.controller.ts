import { Context } from 'hono'
import { officeService } from '../services/office.service'
import { createOfficeSchema, updateOfficeSchema, officeIdSchema } from '../validators/office.validator'

export class OfficeController {
  /**
   * Create a new office
   */
  async create(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = createOfficeSchema.parse(body)

      const office = await officeService.create(validatedData)

      return c.json({
        success: true,
        data: office,
        message: 'Office created successfully',
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
        message: error.message || 'Failed to create office',
      }, 400)
    }
  }

  /**
   * Get all offices
   */
  async getAll(c: Context) {
    try {
      const offices = await officeService.getAll()

      return c.json({
        success: true,
        data: offices,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch offices',
      }, 500)
    }
  }

  /**
   * Get office by ID
   */
  async getById(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = officeIdSchema.parse({ id })

      const office = await officeService.getById(validatedId.id)

      return c.json({
        success: true,
        data: office,
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
        message: error.message || 'Failed to fetch office',
      }, error.message === 'Office not found' ? 404 : 500)
    }
  }

  /**
   * Get offices by election
   */
  async getByElection(c: Context) {
    try {
      const electionId = c.req.query('electionId')
      
      if (!electionId) {
        return c.json({
          success: false,
          message: 'electionId query parameter is required',
        }, 400)
      }

      const offices = await officeService.getByElection(electionId)

      return c.json({
        success: true,
        data: offices,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch offices',
      }, 500)
    }
  }

  /**
   * Update office
   */
  async update(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = officeIdSchema.parse({ id })
      const body = await c.req.json()
      const validatedData = updateOfficeSchema.parse(body)

      const office = await officeService.update(validatedId.id, validatedData)

      return c.json({
        success: true,
        data: office,
        message: 'Office updated successfully',
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
        message: error.message || 'Failed to update office',
      }, error.message === 'Office not found' ? 404 : 400)
    }
  }

  /**
   * Delete office
   */
  async delete(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = officeIdSchema.parse({ id })

      await officeService.delete(validatedId.id)

      return c.json({
        success: true,
        message: 'Office deleted successfully',
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
        message: error.message || 'Failed to delete office',
      }, error.message === 'Office not found' ? 404 : 500)
    }
  }
}

export const officeController = new OfficeController()

