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
   * If user is authenticated (and not admin), filter by domain (class, department, faculty)
   * If admin or not authenticated, return all elections
   */
  async getAll(c: Context) {
    try {
      // Check if user is authenticated and if they're an admin
      const user = c.get('user')
      const admin = c.get('admin')
      let elections

      // Admins and unauthenticated users see all elections
      // Regular authenticated users see only eligible elections
      if (admin || !user || !user.id) {
        // Admin or not authenticated - return all elections
        elections = await electionService.getAll()
      } else {
        // Regular user is authenticated - filter by domain
        elections = await electionService.getEligibleForVoter(user.id)
      }

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
   * If user is authenticated (and not admin), check eligibility before returning
   * Admins can view all elections
   */
  async getById(c: Context) {
    try {
      const identifier = c.req.param('id')
      const user = c.get('user')
      const admin = c.get('admin')
      
      // Try to get by slug first (if it's not a UUID), then by ID
      let election
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
      
      if (isUuid) {
        const validatedId = electionIdSchema.parse({ id: identifier })
        election = await electionService.getById(validatedId.id)
      } else {
        election = await electionService.getBySlug(identifier)
      }

      // If user is authenticated and NOT an admin, check eligibility
      // Admins can view all elections without eligibility checks
      if (user && user.id && !admin) {
        const { checkEligibilityByDomain } = await import('../helpers/eligibility.helpers')
        const eligibility = await checkEligibilityByDomain(user.id, election.id)
        
        if (!eligibility.eligible) {
          return c.json({
            success: false,
            message: eligibility.reason || 'You are not eligible to view this election',
          }, 403)
        }
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

