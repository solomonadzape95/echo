import { eq, and, isNull, gt } from 'drizzle-orm'
import { db } from '../db/db'
import { refreshTokens } from '../models/refreshToken.schema'
import * as bcrypt from 'bcryptjs'
import { generateRefreshToken } from '../helpers/jwt.helpers'
import type { JwtPayload } from '../types/jwt.types'

export class RefreshTokenService {
  /**
   * Create and store a refresh token for a user
   */
  async createRefreshToken(voterId: string, payload: JwtPayload) {
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
        voterId,
        expiresAt,
      })
      .returning()
    
    // Return the plain token (only sent once, never stored in plain text)
    return token
  }

  /**
   * Verify a refresh token is valid and not revoked
   */
  async verifyRefreshToken(token: string, voterId: string): Promise<boolean> {
    // Get all refresh tokens for this user
    const userTokens = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.voterId, voterId),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date())
        )
      )
    
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
   */
  async findTokenByHash(token: string, voterId: string) {
    const userTokens = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.voterId, voterId),
          isNull(refreshTokens.revokedAt)
        )
      )
    
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
   */
  async revokeToken(token: string, voterId: string) {
    const tokenRecord = await this.findTokenByHash(token, voterId)
    
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
   */
  async revokeAllTokens(voterId: string) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.voterId, voterId),
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

