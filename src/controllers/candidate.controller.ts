import { Context } from 'hono'
import { candidateService } from '../services/candidate.service'
import { createCandidateSchema, updateCandidateSchema, candidateIdSchema } from '../validators/candidate.validator'

export class CandidateController {
  /**
   * Create a new candidate
   */
  async create(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = createCandidateSchema.parse(body)

      const candidate = await candidateService.create(validatedData)

      return c.json({
        success: true,
        data: candidate,
        message: 'Candidate created successfully',
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
        message: error.message || 'Failed to create candidate',
      }, 400)
    }
  }

  /**
   * Get all candidates
   */
  async getAll(c: Context) {
    try {
      const candidates = await candidateService.getAll()

      return c.json({
        success: true,
        data: candidates,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch candidates',
      }, 500)
    }
  }

  /**
   * Get candidate by ID
   */
  async getById(c: Context) {
    try {
      const identifier = c.req.param('id')
      
      // Try to get by slug first (if it's not a UUID), then by ID
      let candidate
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
      
      if (isUuid) {
        const validatedId = candidateIdSchema.parse({ id: identifier })
        candidate = await candidateService.getById(validatedId.id)
      } else {
        candidate = await candidateService.getBySlug(identifier)
      }

      return c.json({
        success: true,
        data: candidate,
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
        message: error.message || 'Failed to fetch candidate',
      }, error.message === 'Candidate not found' ? 404 : 500)
    }
  }

  /**
   * Get candidates by office
   */
  async getByOffice(c: Context) {
    try {
      const officeId = c.req.query('officeId')
      
      if (!officeId) {
        return c.json({
          success: false,
          message: 'officeId query parameter is required',
        }, 400)
      }

      const candidates = await candidateService.getByOffice(officeId)

      return c.json({
        success: true,
        data: candidates,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch candidates',
      }, 500)
    }
  }

  /**
   * Update candidate
   */
  async update(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = candidateIdSchema.parse({ id })
      const body = await c.req.json()
      const validatedData = updateCandidateSchema.parse(body)

      const candidate = await candidateService.update(validatedId.id, validatedData)

      return c.json({
        success: true,
        data: candidate,
        message: 'Candidate updated successfully',
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
        message: error.message || 'Failed to update candidate',
      }, error.message === 'Candidate not found' ? 404 : 400)
    }
  }

  /**
   * Delete candidate
   */
  async delete(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = candidateIdSchema.parse({ id })

      await candidateService.delete(validatedId.id)

      return c.json({
        success: true,
        message: 'Candidate deleted successfully',
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
        message: error.message || 'Failed to delete candidate',
      }, error.message === 'Candidate not found' ? 404 : 500)
    }
  }
}

export const candidateController = new CandidateController()

