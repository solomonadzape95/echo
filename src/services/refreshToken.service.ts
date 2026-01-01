import { eq, and, isNull, gt } from 'drizzle-orm'
import { db } from '../db/db'
import { refreshTokens } from '../models/refreshToken.schema'
import * as bcrypt from 'bcryptjs'
import { generateRefreshToken } from '../helpers/jwt.helpers'
import type { JwtPayload } from '../types/jwt.types'

export class RefreshTokenService {
  /**
   * Create and store a refresh token for a user (voter or admin)
   */
  async createRefreshToken(userId: string, payload: JwtPayload, isAdmin: boolean = false) {
    // Generate refresh token
    const token = await generateRefreshToken(payload)
    
    // Hash the token before storing (security best practice)
    const tokenHash = await bcrypt.hash(token, 10)
    
    // Calculate expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    
    // Store in database
    const [refreshToken] = await db
      .insert(refreshTokens)
      .values({
        tokenHash,
        voterId: isAdmin ? null : userId,
        adminId: isAdmin ? userId : null,
        expiresAt,
      })
      .returning()
    
    // Return the plain token (only sent once, never stored in plain text)
    return token
  }

  /**
   * Verify a refresh token is valid and not revoked
   * Supports both voters and admins - automatically detects which one
   */
  async verifyRefreshToken(token: string, userId: string, isAdmin?: boolean): Promise<boolean> {
    const { or } = await import('drizzle-orm')
    
    // Get all refresh tokens for this user (voter or admin)
    let userTokens
    
    if (isAdmin === undefined) {
      // Try to find token for either voter or admin
      userTokens = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            or(
              eq(refreshTokens.voterId, userId),
              eq(refreshTokens.adminId, userId)
            ),
            isNull(refreshTokens.revokedAt),
            gt(refreshTokens.expiresAt, new Date())
          )
        )
    } else {
      // Use the provided isAdmin flag
      userTokens = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            isAdmin 
              ? eq(refreshTokens.adminId, userId)
              : eq(refreshTokens.voterId, userId),
            isNull(refreshTokens.revokedAt),
            gt(refreshTokens.expiresAt, new Date())
          )
        )
    }
    
    // Check if any token hash matches
    for (const storedToken of userTokens) {
      const isValid = await bcrypt.compare(token, storedToken.tokenHash)
      if (isValid) {
        return true
      }
    }
    
    return false
  }

  /**
   * Find refresh token by hash (for revocation)
   * Supports both voters and admins - automatically detects which one
   */
  async findTokenByHash(token: string, userId: string, isAdmin?: boolean) {
    // If isAdmin is not provided, try both voter and admin
    let userTokens
    
    if (isAdmin === undefined) {
      // Try to find token for either voter or admin
      const { or } = await import('drizzle-orm')
      userTokens = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            or(
              eq(refreshTokens.voterId, userId),
              eq(refreshTokens.adminId, userId)
            ),
            isNull(refreshTokens.revokedAt)
          )
        )
    } else {
      // Use the provided isAdmin flag
      userTokens = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            isAdmin
              ? eq(refreshTokens.adminId, userId)
              : eq(refreshTokens.voterId, userId),
            isNull(refreshTokens.revokedAt)
          )
        )
    }
    
    for (const storedToken of userTokens) {
      const isValid = await bcrypt.compare(token, storedToken.tokenHash)
      if (isValid) {
        return storedToken
      }
    }
    
    return null
  }

  /**
   * Revoke a refresh token (logout)
   * Supports both voters and admins - automatically detects which one
   */
  async revokeToken(token: string, userId: string, isAdmin?: boolean) {
    // findTokenByHash will automatically detect if it's a voter or admin token
    const tokenRecord = await this.findTokenByHash(token, userId, isAdmin)
    
    if (!tokenRecord) {
      return false
    }
    
    // Mark as revoked
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenRecord.id))
    
    return true
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   * Supports both voters and admins
   */
  async revokeAllTokens(userId: string, isAdmin: boolean = false) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          isAdmin
            ? eq(refreshTokens.adminId, userId)
            : eq(refreshTokens.voterId, userId),
          isNull(refreshTokens.revokedAt)
        )
      )
  }

  /**
   * Clean up expired tokens (can be run as a cron job)
   */
  async cleanupExpiredTokens() {
    await db
      .delete(refreshTokens)
      .where(gt(new Date(), refreshTokens.expiresAt))
  }
}

export const refreshTokenService = new RefreshTokenService()

