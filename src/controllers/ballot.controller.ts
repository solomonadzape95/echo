import { Context } from 'hono'
import { ballotService } from '../services/ballot.service'

export class BallotController {
  /**
   * Get ballot data for an election
   * GET /ballot?electionId=xxx
   */
  async getBallot(c: Context) {
    try {
      console.log('[BALLOT CONTROLLER] Request received')
      const electionId = c.req.query('electionId')

      if (!electionId) {
        return c.json({
          success: false,
          message: 'electionId query parameter is required',
        }, 400)
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

