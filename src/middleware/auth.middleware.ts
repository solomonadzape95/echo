import { Context, Next } from 'hono'
import { verifyJwtToken } from '../helpers/jwt.helpers'
import { getAccessTokenFromCookie } from '../helpers/cookie.helpers'

/**
 * Authentication middleware that verifies JWT tokens from cookies or Authorization header.
 * Priority: Cookie > Authorization header
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

    if (!token) {
      return c.json(
        {
          success: false,
          message: 'Authentication required. Please login.',
        },
        401
      )
    }

    // Verify and decode the token
    const payload = await verifyJwtToken(token)

    // Attach user to context so controllers can access it via c.get('user')
    c.set('user', payload)

    // Continue to the next middleware/route handler
    await next()
  } catch (error: any) {
    // Token is invalid, expired, or verification failed
    return c.json(
      {
        success: false,
        message: error.message || 'Invalid or expired token',
      },
      401
    )
  }
}
