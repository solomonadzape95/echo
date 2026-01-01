import { Context, Next } from 'hono'
import { verifyJwtToken, decodeJwtToken } from '../helpers/jwt.helpers'
import { getAccessTokenFromCookie, getRefreshTokenFromCookie, setAccessTokenCookie } from '../helpers/cookie.helpers'
import { authService } from '../services/auth.service'

/**
 * Authentication middleware that verifies JWT tokens from cookies or Authorization header.
 * Priority: Cookie > Authorization header
 * If access token is expired, attempts to refresh it using refresh token.
 * If valid, attaches the user payload to the context.
 * If invalid or missing, returns 401 Unauthorized.
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    let token: string | undefined

    // Try to get token from cookie first (preferred for web apps)
    token = getAccessTokenFromCookie(c)

    // Fallback to Authorization header (for API clients)
    if (!token) {
      const authHeader = c.req.header('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    // If no token found, try to refresh
    if (!token) {
      const refreshToken = getRefreshTokenFromCookie(c)
      if (refreshToken) {
        try {
          // Attempt to refresh the access token
          const result = await authService.refreshAccessToken(refreshToken)
          token = result.accessToken
          // Set the new access token in cookie
          setAccessTokenCookie(c, token)
        } catch (refreshError) {
          // Refresh failed, user needs to login again
          return c.json(
            {
              success: false,
              message: 'Authentication required. Please login.',
            },
            401
          )
        }
      } else {
        // No token and no refresh token
        return c.json(
          {
            success: false,
            message: 'Authentication required. Please login.',
          },
          401
        )
      }
    }

    // Verify the token
    try {
      const payload = await verifyJwtToken(token)
      // Attach user to context so controllers can access it via c.get('user')
      c.set('user', payload)
      // Continue to the next middleware/route handler
      await next()
    } catch (verifyError: any) {
      // Token might be expired, try to refresh
      if (verifyError.message?.includes('expired') || verifyError.message?.includes('Expired')) {
        const refreshToken = getRefreshTokenFromCookie(c)
        if (refreshToken) {
          try {
            // Attempt to refresh the access token
            const result = await authService.refreshAccessToken(refreshToken)
            const newToken = result.accessToken
            // Set the new access token in cookie
            setAccessTokenCookie(c, newToken)
            // Verify the new token
            const payload = await verifyJwtToken(newToken)
            c.set('user', payload)
            await next()
            return
          } catch (refreshError) {
            // Refresh failed
            return c.json(
              {
                success: false,
                message: 'Token expired. Please login again.',
              },
              401
            )
          }
        }
      }
      // Token is invalid or verification failed
      return c.json(
        {
          success: false,
          message: verifyError.message || 'Invalid or expired token',
        },
        401
      )
    }
  } catch (error: any) {
    // Unexpected error
    return c.json(
      {
        success: false,
        message: error.message || 'Authentication failed',
      },
      401
    )
  }
}
