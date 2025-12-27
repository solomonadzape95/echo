import { Context } from 'hono'
import { dashboardService } from '../services/dashboard.service'

export class DashboardController {
  /**
   * Get dashboard data for authenticated voter
   * GET /dashboard
   */
  async getDashboard(c: Context) {
    try {
      console.log('[DASHBOARD CONTROLLER] Request received')
      
      // Get voter ID from JWT token (set by authMiddleware)
      const user = c.get('user')
      if (!user || !user.id) {
        console.log('[DASHBOARD CONTROLLER] Unauthorized - no user in token')
        return c.json({
          success: false,
          message: 'Unauthorized: User not found in token',
        }, 401)
      }

      console.log('[DASHBOARD CONTROLLER] Getting dashboard data for user:', user.id)
      const dashboardData = await dashboardService.getDashboardData(user.id)
      console.log('[DASHBOARD CONTROLLER] Dashboard data retrieved successfully')

      return c.json({
        success: true,
        data: dashboardData,
      }, 200)
    } catch (error: any) {
      console.error('[DASHBOARD CONTROLLER] Error:', error)
      console.error('[DASHBOARD CONTROLLER] Error stack:', error.stack)
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch dashboard data',
      }, 500)
    }
  }
}

export const dashboardController = new DashboardController()

