import { Context } from 'hono'
import { voteService } from '../services/vote.service'
import { createVoteSchema, voteIdSchema } from '../validators/vote.validator'

export class VoteController {
  /**
   * Create a new vote atomically (handles genesis vote automatically)
   * This endpoint requires authentication and performs all operations in a transaction
   */
  async create(c: Context) {
    try {
      // Get voter ID from JWT token (set by authMiddleware)
      const user = c.get('user')
      if (!user || !user.id) {
        return c.json({
          success: false,
          message: 'Unauthorized: User not found in token',
        }, 401)
      }

      const body = await c.req.json()
      const validatedData = createVoteSchema.parse(body)

      // Create vote atomically (includes eligibility check, token verification, vote creation, and receipt generation)
      const result = await voteService.create(validatedData, user.id)

      return c.json({
        success: true,
        data: {
          vote: result.vote,
          receipt: {
            code: result.receipt.receiptCode,
            id: result.receipt.id,
          },
        },
        message: 'Vote created successfully',
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
        message: error.message || 'Failed to create vote',
      }, 400)
    }
  }

  /**
   * Get all votes
   */
  async getAll(c: Context) {
    try {
      const votes = await voteService.getAll()

      return c.json({
        success: true,
        data: votes,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch votes',
      }, 500)
    }
  }

  /**
   * Get vote by ID
   */
  async getById(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = voteIdSchema.parse({ id })

      const vote = await voteService.getById(validatedId.id)

      return c.json({
        success: true,
        data: vote,
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
        message: error.message || 'Failed to fetch vote',
      }, error.message === 'Vote not found' ? 404 : 500)
    }
  }

  /**
   * Get votes by election
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

      const votes = await voteService.getByElection(electionId)

      return c.json({
        success: true,
        data: votes,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch votes',
      }, 500)
    }
  }

  /**
   * Verify vote chain integrity
   */
  async verifyChain(c: Context) {
    try {
      const electionId = c.req.query('electionId')
      
      if (!electionId) {
        return c.json({
          success: false,
          message: 'electionId query parameter is required',
        }, 400)
      }

      const result = await voteService.verifyChain(electionId)

      return c.json({
        success: true,
        data: result,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to verify vote chain',
      }, 500)
    }
  }
}

export const voteController = new VoteController()

