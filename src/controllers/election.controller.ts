import { Context } from 'hono'
import { electionService } from '../services/election.service'
import { 
  createElectionSchema, 
  updateElectionSchema, 
  electionIdSchema,
  getElectionsByTypeSchema,
  getElectionsByStatusSchema
} from '../validators/election.validator'

export class ElectionController {
  /**
   * Create a new election
   */
  async create(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = createElectionSchema.parse(body)

      const election = await electionService.create(validatedData)

      return c.json({
        success: true,
        data: election,
        message: 'Election created successfully',
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
        message: error.message || 'Failed to create election',
      }, 400)
    }
  }

  /**
   * Get all elections
   */
  async getAll(c: Context) {
    try {
      const elections = await electionService.getAll()

      return c.json({
        success: true,
        data: elections,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch elections',
      }, 500)
    }
  }

  /**
   * Get election by ID or slug
   */
  async getById(c: Context) {
    try {
      const identifier = c.req.param('id')
      
      // Try to get by slug first (if it's not a UUID), then by ID
      let election
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
      
      if (isUuid) {
        const validatedId = electionIdSchema.parse({ id: identifier })
        election = await electionService.getById(validatedId.id)
      } else {
        election = await electionService.getBySlug(identifier)
      }

      return c.json({
        success: true,
        data: election,
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
        message: error.message || 'Failed to fetch election',
      }, error.message === 'Election not found' ? 404 : 500)
    }
  }

  /**
   * Get elections by type
   */
  async getByType(c: Context) {
    try {
      const type = c.req.query('type') as 'class' | 'department' | 'faculty' | undefined
      
      if (!type) {
        return c.json({
          success: false,
          message: 'type query parameter is required',
        }, 400)
      }

      const validated = getElectionsByTypeSchema.parse({ type })
      const elections = await electionService.getByType(validated.type)

      return c.json({
        success: true,
        data: elections,
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
        message: error.message || 'Failed to fetch elections',
      }, 500)
    }
  }

  /**
   * Get elections by status
   */
  async getByStatus(c: Context) {
    try {
      const status = c.req.query('status') as 'pending' | 'active' | 'completed' | undefined
      
      if (!status) {
        return c.json({
          success: false,
          message: 'status query parameter is required',
        }, 400)
      }

      const validated = getElectionsByStatusSchema.parse({ status })
      const elections = await electionService.getByStatus(validated.status)

      return c.json({
        success: true,
        data: elections,
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
        message: error.message || 'Failed to fetch elections',
      }, 500)
    }
  }

  /**
   * Get elections by domain
   */
  async getByDomain(c: Context) {
    try {
      const domainId = c.req.query('domainId')
      
      if (!domainId) {
        return c.json({
          success: false,
          message: 'domainId query parameter is required',
        }, 400)
      }

      const elections = await electionService.getByDomain(domainId)

      return c.json({
        success: true,
        data: elections,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch elections',
      }, 500)
    }
  }

  /**
   * Get active elections
   */
  async getActive(c: Context) {
    try {
      const elections = await electionService.getActive()

      return c.json({
        success: true,
        data: elections,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch active elections',
      }, 500)
    }
  }

  /**
   * Update election
   */
  async update(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = electionIdSchema.parse({ id })
      const body = await c.req.json()
      const validatedData = updateElectionSchema.parse(body)

      const election = await electionService.update(validatedId.id, validatedData)

      return c.json({
        success: true,
        data: election,
        message: 'Election updated successfully',
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
        message: error.message || 'Failed to update election',
      }, error.message === 'Election not found' ? 404 : 400)
    }
  }

  /**
   * Delete election
   */
  async delete(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = electionIdSchema.parse({ id })

      await electionService.delete(validatedId.id)

      return c.json({
        success: true,
        message: 'Election deleted successfully',
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
        message: error.message || 'Failed to delete election',
      }, error.message === 'Election not found' ? 404 : 500)
    }
  }
}

export const electionController = new ElectionController()

