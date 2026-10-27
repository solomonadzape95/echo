import { Context } from 'hono'
import { resultService } from '../services/result.service'
import { electionService } from '../services/election.service'
import { notificationService } from '../services/notification.service'
import { calculateResultsSchema } from '../validators/result.validator'

export class ResultController {
  /**
   * Calculate and store election results (Admin only)
   * POST /admin/election/:id/calculate-results
   */
  async calculateResults(c: Context) {
    try {
      const electionId = c.req.param('id')
      const user = c.get('user') // From adminMiddleware

      if (!electionId) {
        return c.json(
          {
            success: false,
            message: 'Election ID is required',
          },
          400
        )
      }

      // Validate election ID format
      const validation = calculateResultsSchema.safeParse({ electionId })
      if (!validation.success) {
        return c.json(
          {
            success: false,
            message: 'Invalid election ID',
            errors: validation.error.errors,
          },
          400
        )
      }

      // Calculate results
      const summary = await resultService.calculateResults(electionId, user.id)

      // Notify eligible voters that results are available. The unique index
      // makes this safe if auto-publish already sent the same event.
      void notificationService
        .notifyResultsPublishedById(electionId)
        .catch((error) => {
          console.error('[RESULT CONTROLLER] Failed to notify results:', error?.message || error)
        })

      return c.json(
        {
          success: true,
          message: 'Results calculated successfully',
          data: summary,
        },
        200
      )
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to calculate results',
        },
        500
      )
    }
  }

  /**
   * Get election results (Public - after election ends)
   * GET /election/:id/results
   */
  async getResults(c: Context) {
    try {
      const electionId = c.req.param('id')

      if (!electionId) {
        return c.json(
          {
            success: false,
            message: 'Election ID is required',
          },
          400
        )
      }

      // Validate election ID format
      const validation = calculateResultsSchema.safeParse({ electionId })
      if (!validation.success) {
        return c.json(
          {
            success: false,
            message: 'Invalid election ID',
            errors: validation.error.errors,
          },
          400
        )
      }

      // A public results request may be the first request after the end date.
      // Refresh statuses (and auto-publish) before reading, so a direct link to
      // the results page does not show "not calculated yet" for a finished
      // election.
      await electionService.updateElectionStatuses()

      // Get results
      const results = await resultService.getResults(electionId)

      return c.json(
        {
          success: true,
          data: results,
        },
        200
      )
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to get results',
        },
        500
      )
    }
  }

  /**
   * Check if results have been calculated (Public)
   * GET /election/:id/results/status
   */
  async checkResultsStatus(c: Context) {
    try {
      const electionId = c.req.param('id')

      if (!electionId) {
        return c.json(
          {
            success: false,
            message: 'Election ID is required',
          },
          400
        )
      }

      // Allow a status poll to be the request that closes an expired election.
      await electionService.updateElectionStatuses()

      const hasResults = await resultService.hasResults(electionId)

      return c.json(
        {
          success: true,
          data: {
            electionId,
            hasResults,
          },
        },
        200
      )
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to check results status',
        },
        500
      )
    }
  }
}

export const resultController = new ResultController()

