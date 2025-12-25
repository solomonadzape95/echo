import { Context, Next } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { admins } from '../models/admin.schema'
import { authMiddleware } from './auth.middleware'

/**
 * Admin authentication middleware
 * 
 * This middleware:
 * 1. First checks if user is authenticated (using authMiddleware)
 * 2. Then checks if the authenticated user is an admin
 * 
 * Usage:
 * admin.use('*', adminMiddleware)
 * or
 * admin.get('/route', adminMiddleware, handler)
 */
export async function adminMiddleware(c: Context, next: Next) {
  // First, ensure user is authenticated
  // We'll call authMiddleware logic, but we need to check admin status
  try {
    let token: string | undefined

    // Try to get token from cookie first
    const { getAccessTokenFromCookie } = await import('../helpers/cookie.helpers')
    token = getAccessTokenFromCookie(c)

    // Fallback to Authorization header
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

    // Verify token
    const { verifyJwtToken } = await import('../helpers/jwt.helpers')
    const payload = await verifyJwtToken(token)
    
    // Check if user is admin
    // For now, we'll check if the username exists in admins table
    // In production, you might want to store admin ID in JWT or have separate admin JWT
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, payload.username))
      .limit(1)

    if (!admin) {
      return c.json(
        {
          success: false,
          message: 'Admin access required. You do not have permission to access this resource.',
        },
        403
      )
    }

    // Attach admin info to context
    c.set('user', payload)
    c.set('admin', admin)

    await next()
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: error.message || 'Authentication failed',
      },
      401
    )
  }
}

