import { eq, and, isNull, gt } from 'drizzle-orm'
import { db } from '../db/db'
import { passwordResetTokens } from '../models/passwordResetToken.schema'
import * as bcrypt from 'bcryptjs'
import crypto from 'crypto'

export class PasswordResetService {
  /**
   * Generate and store a password reset token
   * Returns the plain token (to be sent via email/SMS in production)
   */
  async createResetToken(voterId: string) {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Hash the token before storing
    const tokenHash = await bcrypt.hash(token, 10)
    
    // Calculate expiration (1 hour from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)
    
    // Invalidate any existing tokens for this user
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.voterId, voterId),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
    
    // Store new token in database
    await db
      .insert(passwordResetTokens)
      .values({
        voterId,
        tokenHash,
        expiresAt,
      })
    
    // Return the plain token (only sent once, never stored in plain text)
    return token
  }

  /**
   * Verify a reset token is valid and not used
   */
  async verifyResetToken(token: string): Promise<string | null> {
    // Get all unused, unexpired tokens
    const tokens = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
    
    // Find the token that matches
    for (const storedToken of tokens) {
      const isValid = await bcrypt.compare(token, storedToken.tokenHash)
      if (isValid) {
        return storedToken.voterId
      }
    }
    
    return null
  }

  /**
   * Mark a reset token as used
   */
  async markTokenAsUsed(token: string) {
    const tokens = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
    
    for (const storedToken of tokens) {
      const isValid = await bcrypt.compare(token, storedToken.tokenHash)
      if (isValid) {
        await db
          .update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(eq(passwordResetTokens.id, storedToken.id))
        return
      }
    }
  }
}

export const passwordResetService = new PasswordResetService()

