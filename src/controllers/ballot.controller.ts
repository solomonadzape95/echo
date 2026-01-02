import { Context } from 'hono'
import { ballotService } from '../services/ballot.service'
import { checkEligibilityByDomain } from '../helpers/eligibility.helpers'

export class BallotController {
  /**
   * Get ballot data for an election
   * GET /ballot?electionId=xxx
   * Requires authentication and eligibility check (unless admin)
   * Admins can view all ballots
   */
  async getBallot(c: Context) {
    try {
      console.log('[BALLOT CONTROLLER] Request received')
      
      // Check authentication
      const user = c.get('user')
      const admin = c.get('admin')
      if (!user || !user.id) {
        return c.json({
          success: false,
          message: 'Authentication required to view ballot',
        }, 401)
      }

      const electionId = c.req.query('electionId')

      if (!electionId) {
        return c.json({
          success: false,
          message: 'electionId query parameter is required',
        }, 400)
      }

      // Check eligibility before fetching ballot data (unless admin)
      // Admins can view all ballots without eligibility checks
      if (!admin) {
        const eligibility = await checkEligibilityByDomain(user.id, electionId)
        if (!eligibility.eligible) {
          return c.json({
            success: false,
            message: eligibility.reason || 'You are not eligible to vote in this election',
          }, 403)
        }
      }

      console.log('[BALLOT CONTROLLER] Getting ballot data for election:', electionId)
      const ballotData = await ballotService.getBallotData(electionId)
      console.log('[BALLOT CONTROLLER] Ballot data retrieved successfully')

      return c.json({
        success: true,
        data: ballotData,
      }, 200)
    } catch (error: any) {
      console.error('[BALLOT CONTROLLER] Error:', error)
      console.error('[BALLOT CONTROLLER] Error stack:', error.stack)
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch ballot data',
      }, 500)
    }
  }
}

export const ballotController = new BallotController()

