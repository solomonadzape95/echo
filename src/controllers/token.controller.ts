import { Context } from 'hono'
import { tokenService } from '../services/token.service'
import { createTokenSchema, updateTokenSchema, tokenIdSchema } from '../validators/token.validator'

export class TokenController {
  /**
   * Create a new voting token
   */
  async create(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = createTokenSchema.parse(body)

      const token = await tokenService.create(validatedData)

      return c.json({
        success: true,
        data: token,
        message: 'Token created successfully',
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
        message: error.message || 'Failed to create token',
      }, 400)
    }
  }

  /**
   * Get all tokens
   */
  async getAll(c: Context) {
    try {
      const tokens = await tokenService.getAll()

      return c.json({
        success: true,
        data: tokens,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch tokens',
      }, 500)
    }
  }

  /**
   * Get token by ID
   */
  async getById(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = tokenIdSchema.parse({ id })

      const token = await tokenService.getById(validatedId.id)

      return c.json({
        success: true,
        data: token,
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
        message: error.message || 'Failed to fetch token',
      }, error.message === 'Token not found' ? 404 : 500)
    }
  }

  /**
   * Get tokens by election
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

      const tokens = await tokenService.getByElection(electionId)

      return c.json({
        success: true,
        data: tokens,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch tokens',
      }, 500)
    }
  }

  /**
   * Get unused tokens by election
   */
  async getUnusedByElection(c: Context) {
    try {
      const electionId = c.req.query('electionId')
      
      if (!electionId) {
        return c.json({
          success: false,
          message: 'electionId query parameter is required',
        }, 400)
      }

      const tokens = await tokenService.getUnusedByElection(electionId)

      return c.json({
        success: true,
        data: tokens,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch unused tokens',
      }, 500)
    }
  }

  /**
   * Mark token as used
   */
  async markAsUsed(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = tokenIdSchema.parse({ id })

      const token = await tokenService.markAsUsed(validatedId.id)

      return c.json({
        success: true,
        data: token,
        message: 'Token marked as used',
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
        message: error.message || 'Failed to mark token as used',
      }, error.message === 'Token not found' ? 404 : 400)
    }
  }

  /**
   * Update token
   */
  async update(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = tokenIdSchema.parse({ id })
      const body = await c.req.json()
      const validatedData = updateTokenSchema.parse(body)

      const token = await tokenService.update(validatedId.id, validatedData)

      return c.json({
        success: true,
        data: token,
        message: 'Token updated successfully',
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
        message: error.message || 'Failed to update token',
      }, error.message === 'Token not found' ? 404 : 400)
    }
  }

  /**
   * Delete token
   */
  async delete(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = tokenIdSchema.parse({ id })

      await tokenService.delete(validatedId.id)

      return c.json({
        success: true,
        message: 'Token deleted successfully',
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
        message: error.message || 'Failed to delete token',
      }, error.message === 'Token not found' ? 404 : 500)
    }
  }
}

export const tokenController = new TokenController()

