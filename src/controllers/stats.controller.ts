import { Context } from 'hono'
import { statsService } from '../services/stats.service'
import { authMiddleware } from '../middleware/auth.middleware'

export class StatsController {
  /**
   * Get overall statistics across all elections
   * GET /stats
   */
  async getOverallStats(c: Context) {
    try {
      const stats = await statsService.getOverallStats()

      return c.json({
        success: true,
        data: stats,
      }, 200)
    } catch (error: any) {
      console.error('[STATS CONTROLLER] Error getting overall stats:', error)
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch overall statistics',
      }, 500)
    }
  }

  /**
   * Get statistics for a specific election
   * GET /stats/election/:electionId
   */
  async getElectionStats(c: Context) {
    try {
      const electionId = c.req.param('electionId')

      if (!electionId) {
        return c.json({
          success: false,
          message: 'Election ID is required',
        }, 400)
      }

      const stats = await statsService.getElectionStats(electionId)

      return c.json({
        success: true,
        data: stats,
      }, 200)
    } catch (error: any) {
      console.error('[STATS CONTROLLER] Error getting election stats:', error)
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch election statistics',
      }, 500)
    }
  }

  /**
   * Check if a voter has voted in a specific election
   * GET /stats/voter/:voterId/election/:electionId
   * Requires authentication (admin or the voter themselves)
   */
  async checkVoterVoted(c: Context) {
    try {
      const voterId = c.req.param('voterId')
      const electionId = c.req.param('electionId')

      if (!voterId || !electionId) {
        return c.json({
          success: false,
          message: 'Voter ID and Election ID are required',
        }, 400)
      }

      // Get current user from auth middleware
      const user = c.get('user')
      const admin = c.get('admin')
      
      // Allow if user is the voter themselves or is an admin
      if (!user || (!admin && user.id !== voterId)) {
        return c.json({
          success: false,
          message: 'Unauthorized: You can only check your own voting status or must be an admin',
        }, 403)
      }

      const hasVoted = await statsService.hasVoterVoted(voterId, electionId)

      return c.json({
        success: true,
        data: {
          voterId,
          electionId,
          hasVoted,
        },
      }, 200)
    } catch (error: any) {
      console.error('[STATS CONTROLLER] Error checking voter voted:', error)
      return c.json({
        success: false,
        message: error.message || 'Failed to check voting status',
      }, 500)
    }
  }

  /**
   * Get voting participation for a specific voter across all elections
   * GET /stats/voter/:voterId
   * Requires authentication (admin or the voter themselves)
   */
  async getVoterParticipation(c: Context) {
    try {
      const voterId = c.req.param('voterId')

      if (!voterId) {
        return c.json({
          success: false,
          message: 'Voter ID is required',
        }, 400)
      }

      // Get current user from auth middleware
      const user = c.get('user')
      const admin = c.get('admin')
      
      // Allow if user is the voter themselves or is an admin
      if (!user || (!admin && user.id !== voterId)) {
        return c.json({
          success: false,
          message: 'Unauthorized: You can only view your own participation or must be an admin',
        }, 403)
      }

      const participation = await statsService.getVoterParticipation(voterId)

      return c.json({
        success: true,
        data: participation,
      }, 200)
    } catch (error: any) {
      console.error('[STATS CONTROLLER] Error getting voter participation:', error)
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch voter participation',
      }, 500)
    }
  }
}

export const statsController = new StatsController()

