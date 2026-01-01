import { Context } from 'hono'
import { profileService } from '../services/profile.service'

export class ProfileController {
  /**
   * Get profile data for authenticated voter
   * GET /profile
   */
  async getProfile(c: Context) {
    try {
      console.log('[PROFILE CONTROLLER] Request received')
      
      // Get voter ID from JWT token (set by authMiddleware)
      const user = c.get('user')
      if (!user || !user.id) {
        console.log('[PROFILE CONTROLLER] Unauthorized - no user in token')
        return c.json({
          success: false,
          message: 'Unauthorized: User not found in token',
        }, 401)
      }

      console.log('[PROFILE CONTROLLER] Getting profile data for user:', user.id)
      const profileData = await profileService.getProfileData(user.id)
      console.log('[PROFILE CONTROLLER] Profile data retrieved successfully')

      return c.json({
        success: true,
        data: profileData,
      }, 200)
    } catch (error: any) {
      console.error('[PROFILE CONTROLLER] Error:', error)
      console.error('[PROFILE CONTROLLER] Error stack:', error.stack)
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch profile data',
      }, 500)
    }
  }

  /**
   * Update profile picture for authenticated voter
   * PUT /profile/picture
   */
  async updateProfilePicture(c: Context) {
    try {
      const user = c.get('user')
      if (!user || !user.id) {
        return c.json({
          success: false,
          message: 'Unauthorized: User not found in token',
        }, 401)
      }

      const body = await c.req.json()
      const { profilePicture } = body

      if (!profilePicture || typeof profilePicture !== 'string') {
        return c.json({
          success: false,
          message: 'Profile picture URL is required',
        }, 400)
      }

      await profileService.updateProfilePicture(user.id, profilePicture)

      return c.json({
        success: true,
        message: 'Profile picture updated successfully',
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to update profile picture',
      }, 500)
    }
  }
}

export const profileController = new ProfileController()

