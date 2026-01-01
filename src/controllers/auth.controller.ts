import { Context } from 'hono'
import { authService } from '../services/auth.service'
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validators/auth.validator'
import { setAccessTokenCookie, setRefreshTokenCookie, clearTokenCookies, getRefreshTokenFromCookie } from '../helpers/cookie.helpers'
import { refreshTokenService } from '../services/refreshToken.service'

export class AuthController {
  /**
   * Handle login request
   */
  async login(c: Context) {
    try {
      // Parse and validate request body
      const body = await c.req.json()
      const validatedData = loginSchema.parse(body)

      // Call service (returns { user, accessToken, refreshToken, isAdmin, admin? })
      const result = await authService.login(validatedData)
      const { user, accessToken, refreshToken } = result

      // Set tokens in secure cookies
      setAccessTokenCookie(c, accessToken)
      setRefreshTokenCookie(c, refreshToken)

      // Return success response (tokens are in cookies, but also return user/admin data)
      const responseData: any = {
        user,
      }
      
      // Include admin field if it's an admin login
      if ('admin' in result) {
        responseData.admin = result.admin
        responseData.isAdmin = true
      } else {
        responseData.isAdmin = false
      }

      return c.json({
        success: true,
        data: responseData,
        message: 'Login successful',
      }, 200)
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        return c.json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        }, 400)
      }

      // Handle business logic errors
      return c.json({
        success: false,
        message: error.message || 'Login failed',
      }, 401)
    }
  }

  /**
   * Handle registration request
   */
  async register(c: Context) {
    try {
      // Parse and validate request body
      const body = await c.req.json()
      const validatedData = registerSchema.parse(body)

      // Call service (returns { user, accessToken, refreshToken })
      const { user, accessToken, refreshToken } = await authService.register(validatedData)

      // Set tokens in secure cookies
      setAccessTokenCookie(c, accessToken)
      setRefreshTokenCookie(c, refreshToken)

      // Return success response (tokens are in cookies)
      return c.json({
        success: true,
        data: {
          user,
        },
        message: 'Registration successful',
      }, 201)
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        return c.json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        }, 400)
      }

      // Handle business logic errors
      return c.json({
        success: false,
        message: error.message || 'Registration failed',
      }, 400)
    }
  }

  /**
   * Handle forgot password request
   */
  async forgotPassword(c: Context) {
    try {
      // Parse and validate request body
      const body = await c.req.json()
      const validatedData = forgotPasswordSchema.parse(body)

      // Request password reset (generates token and sends email)
      const result = await authService.requestPasswordReset(
        validatedData.regNumber,
        validatedData.email
      )

      // Always return success (don't reveal if user exists)
      return c.json({
        success: true,
        message: 'If an account exists with this registration number, password reset instructions have been sent to your email.',
        // In development, include token for testing (remove in production)
        ...(process.env.NODE_ENV === 'development' && result.token ? { token: result.token } : {}),
      }, 200)
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        return c.json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        }, 400)
      }

      return c.json({
        success: false,
        message: error.message || 'Request failed',
      }, 500)
    }
  }

  /**
   * Handle reset password request
   */
  async resetPassword(c: Context) {
    try {
      // Parse and validate request body
      const body = await c.req.json()
      const validatedData = resetPasswordSchema.parse(body)

      // Reset password
      await authService.resetPassword(validatedData)

      return c.json({
        success: true,
        message: 'Password reset successfully',
      }, 200)
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        return c.json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        }, 400)
      }

      return c.json({
        success: false,
        message: error.message || 'Password reset failed',
      }, 400)
    }
  }

  /**
   * Handle change password request (for authenticated users)
   */
  async changePassword(c: Context) {
    try {
      // Get user from context (set by authMiddleware)
      const user = c.get('user')
      if (!user || !user.id) {
        return c.json({
          success: false,
          message: 'Unauthorized',
        }, 401)
      }

      // Parse and validate request body
      const body = await c.req.json()
      const validatedData = changePasswordSchema.parse(body)

      // Change password
      await authService.changePassword(user.id, validatedData)

      return c.json({
        success: true,
        message: 'Password changed successfully',
      }, 200)
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        return c.json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        }, 400)
      }

      return c.json({
        success: false,
        message: error.message || 'Password change failed',
      }, 400)
    }
  }

  /**
   * Handle refresh token request
   */
  async refresh(c: Context) {
    try {
      // Get refresh token from cookie
      const refreshToken = getRefreshTokenFromCookie(c)

      if (!refreshToken) {
        return c.json({
          success: false,
          message: 'Refresh token not found',
        }, 401)
      }

      // Call service to refresh access token (returns { accessToken, user?, admin?, isAdmin })
      const result = await authService.refreshAccessToken(refreshToken)
      const { accessToken } = result

      // Set new access token in cookie
      setAccessTokenCookie(c, accessToken)

      // Build response data - handle both admin and voter
      const responseData: any = {}
      if (result.isAdmin && result.admin) {
        responseData.admin = result.admin
        responseData.isAdmin = true
      } else if (result.user) {
        responseData.user = result.user
        responseData.isAdmin = false
      }

      return c.json({
        success: true,
        data: responseData,
        message: 'Token refreshed successfully',
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to refresh token',
      }, 401)
    }
  }

  /**
   * Handle logout request
   */
  async logout(c: Context) {
    try {
      // Get refresh token from cookie
      const refreshToken = getRefreshTokenFromCookie(c)
      const user = c.get('user') // Get user from context (set by middleware)

      // Revoke refresh token if it exists
      // revokeToken will automatically detect if it's a voter or admin token
      if (refreshToken && user) {
        await refreshTokenService.revokeToken(refreshToken, user.id)
      }

      // Clear cookies
      clearTokenCookies(c)

      return c.json({
        success: true,
        message: 'Logout successful',
      }, 200)
    } catch (error: any) {
      // Even if revocation fails, clear cookies
      clearTokenCookies(c)
      
      return c.json({
        success: true,
        message: 'Logout successful',
      }, 200)
    }
  }
}

export const authController = new AuthController()

