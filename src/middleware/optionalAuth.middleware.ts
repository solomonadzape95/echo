import { Context, Next } from 'hono'
import { verifyJwtToken } from '../helpers/jwt.helpers'
import { getAccessTokenFromCookie } from '../helpers/cookie.helpers'
import { authService } from '../services/auth.service'
import { getRefreshTokenFromCookie, setAccessTokenCookie } from '../helpers/cookie.helpers'

/**
 * Optional authentication middleware that verifies JWT tokens if present.
 * Unlike authMiddleware, this does NOT return 401 if no token is found.
 * It only sets the user in context if a valid token exists.
 * Used for endpoints that work both with and without authentication.
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
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

    // If no token found, continue without authentication
    if (!token) {
      await next()
      return
    }

    // Verify the token
    try {
      const payload = await verifyJwtToken(token)
      // Attach user to context so controllers can access it via c.get('user')
      c.set('user', payload)
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
            // Refresh failed, but continue without authentication
            await next()
            return
          }
        }
      }
      // Token is invalid, but continue without authentication
      await next()
    }
  } catch (error: any) {
    // Unexpected error, but continue without authentication
    await next()
  }
}

