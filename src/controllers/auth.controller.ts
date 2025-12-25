import { Context } from 'hono'
import { authService } from '../services/auth.service'
import { loginSchema, registerSchema, forgotPasswordSchema } from '../validators/auth.validator'
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

      // Call service (returns { user, accessToken, refreshToken })
      const { user, accessToken, refreshToken } = await authService.login(validatedData)

      // Set tokens in secure cookies
      setAccessTokenCookie(c, accessToken)
      setRefreshTokenCookie(c, refreshToken)

      // Return success response (tokens are in cookies, but also return user data)
      return c.json({
        success: true,
        data: {
          user,
          // Optionally return tokens for mobile apps that can't use cookies
          // accessToken,
          // refreshToken,
        },
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

      // Find user
      const user = await authService.findByRegistrationNumber(validatedData.regNumber)

      if (!user) {
        return c.json({
          success: false,
          message: 'User not found or registration number does not match',
        }, 404)
      }

      // TODO: Implement password reset logic (send email, generate token, etc.)

      return c.json({
        success: true,
        message: 'Password reset instructions sent',
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

      // Call service to refresh access token
      const { accessToken, user } = await authService.refreshAccessToken(refreshToken)

      // Set new access token in cookie
      setAccessTokenCookie(c, accessToken)

      return c.json({
        success: true,
        data: {
          user,
        },
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

