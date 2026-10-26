import { Context } from 'hono'
import { authService } from '../services/auth.service'
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validators/auth.validator'
import { setAccessTokenCookie, setRefreshTokenCookie, clearTokenCookies, getRefreshTokenFromCookie } from '../helpers/cookie.helpers'
import { refreshTokenService } from '../services/refreshToken.service'
import { DeviceBindingError, type DeviceContext } from '../services/deviceBinding.service'

/**
 * Native clients (React Native) have no cookie jar, so they ask for the tokens
 * in the response body and send them back as `Authorization: Bearer ...`.
 * Web clients keep using HttpOnly cookies and never receive tokens in JSON.
 */
const isNativeClient = (c: Context) => c.req.header('x-client-platform') === 'native'

/** Read the stable device id/header pair sent by native clients. */
function deviceFromRequest(c: Context): { native: boolean; device?: DeviceContext; missing: boolean } {
  const native = isNativeClient(c)
  const id = c.req.header('x-device-id')?.trim()
  const platform = c.req.header('x-device-platform')?.trim() || 'unknown'

  if (!native) {
    return { native, missing: false }
  }
  if (!id) {
    return { native, missing: true }
  }
  return { native, device: { id, platform }, missing: false }
}

/** Map service errors to the right HTTP status without leaking internals. */
function authError(c: Context, error: any) {
  if (error.name === 'ZodError') {
    return c.json({
      success: false,
      message: 'Validation error',
      errors: error.errors,
    }, 400)
  }

  if (error instanceof DeviceBindingError) {
    return c.json({
      success: false,
      message: error.message,
      code: 'DEVICE_BINDING',
    }, error.status)
  }

  return c.json({
    success: false,
    message: error.message || 'Login failed',
  }, 401)
}

const missingDeviceResponse = (c: Context) => c.json({
  success: false,
  message: 'This build of the app did not send a device identifier. Update the app to sign in.',
  code: 'DEVICE_ID_REQUIRED',
}, 400)

export class AuthController {
  /**
   * Handle login request
   */
  async login(c: Context) {
    try {
      // Parse and validate request body
      const body = await c.req.json()
      const validatedData = loginSchema.parse(body)

      const device = deviceFromRequest(c)
      if (device.missing) {
        return missingDeviceResponse(c)
      }

      // Call service (returns { user, accessToken, refreshToken, isAdmin, admin? })
      const result = await authService.login(validatedData, device.device)
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

      // Native clients need the tokens in the body (no cookie jar).
      if (isNativeClient(c)) {
        responseData.accessToken = accessToken
        responseData.refreshToken = refreshToken
      }

      return c.json({
        success: true,
        data: responseData,
        message: 'Login successful',
      }, 200)
    } catch (error: any) {
      return authError(c, error)
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

      const device = deviceFromRequest(c)
      if (device.missing) {
        return missingDeviceResponse(c)
      }

      // Call service (returns { user, accessToken, refreshToken })
      const { user, accessToken, refreshToken } = await authService.register(validatedData, device.device)

      // Set tokens in secure cookies
      setAccessTokenCookie(c, accessToken)
      setRefreshTokenCookie(c, refreshToken)

      // Return success response (tokens are in cookies)
      return c.json({
        success: true,
        data: {
          user,
          ...(isNativeClient(c) ? { accessToken, refreshToken } : {}),
        },
        message: 'Registration successful',
      }, 201)
    } catch (error: any) {
      if (error.name === 'ZodError' || error instanceof DeviceBindingError) {
        return authError(c, error)
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
      // Web: refresh token comes from the HttpOnly cookie.
      // Native: it is sent in the body because RN has no cookie jar.
      const body = await c.req.json().catch(() => ({}) as any)
      const refreshToken = getRefreshTokenFromCookie(c) || body?.refreshToken

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

      if (isNativeClient(c)) {
        responseData.accessToken = accessToken
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

