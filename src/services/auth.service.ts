import { eq, and, isNull, gt, or } from 'drizzle-orm'
import { createHmac } from 'node:crypto'
import { db } from '../db/db'
import { voters } from '../models/voter.schema'
import { admins } from '../models/admin.schema'
import { refreshTokens } from '../models/refreshToken.schema'
import { masterlist } from '../models/masterlist.schema'
import type { LoginInput, RegisterInput, ResetPasswordInput, ChangePasswordInput } from '../validators/auth.validator'
import * as bcrypt from 'bcryptjs'
import { generateAccessToken } from '../helpers/jwt.helpers'
import { refreshTokenService } from './refreshToken.service'
import { passwordResetService } from './passwordReset.service'
import { emailService } from './email.service'
import { deviceBindingService, type DeviceContext } from './deviceBinding.service'
import type { JwtPayload } from '../types/jwt.types'


const REGISTRATION_CODE_PEPPER =
  process.env.REGISTRATION_CODE_PEPPER || 'blindvote-registration-code-v1'

/** Hash a one-time claim code before comparison/storage. */
export function hashRegistrationCode(code: string): string {
  return createHmac('sha256', REGISTRATION_CODE_PEPPER)
    .update(code.trim().toUpperCase())
    .digest('hex')
}


export class AuthService {
  /**
   * Authenticate a user by registration number and password
   * Returns user data and JWT token
   */
  async login(input: LoginInput, device?: DeviceContext) {
    // Find user by registration number
    const [user] = await db
      .select()
      .from(voters)
      .where(eq(voters.regNumber, input.regNumber))
      .limit(1)

    if (!user) {
      throw new Error('Registration number or password is incorrect')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.password)
    if (!isValidPassword) {
      throw new Error('Registration number or password is incorrect')
    }

    if (user.disabled) {
      throw new Error('This account has been disabled. Contact an administrator.')
    }

    // Claim this device for the account (no-op when already claimed).
    // Native clients always send a device id; the controller rejects requests
    // without one, so the lock cannot be skipped by simply omitting the header.
    if (device) {
      await deviceBindingService.bind(user.id, device.id, device.platform)
    }

    // Create JWT payload matching JwtPayload interface
    const jwtPayload: JwtPayload = {
      id: user.id,
      regNumber: user.regNumber,
      username: user.username,
      classId: user.class,
    }

    // Generate access token (short-lived: 15 minutes)
    const accessToken = await generateAccessToken(jwtPayload)
    
    // Generate and store refresh token (long-lived: 7 days)
    const refreshToken = await refreshTokenService.createRefreshToken(user.id, jwtPayload)

    // Return user (without password) and tokens
    const { password, ...userWithoutPassword } = user
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }
  }

  /**
   * Issue a session (access + refresh token) for an already-authenticated voter.
   * Used by WebAuthn login, which authenticates without a password.
   */
  async issueSession(user: typeof voters.$inferSelect, device?: DeviceContext) {
    if (device) {
      await deviceBindingService.bind(user.id, device.id, device.platform)
    }

    const jwtPayload: JwtPayload = {
      id: user.id,
      regNumber: user.regNumber,
      username: user.username,
      classId: user.class,
    }

    const accessToken = await generateAccessToken(jwtPayload)
    const refreshToken = await refreshTokenService.createRefreshToken(user.id, jwtPayload)

    const { password, ...userWithoutPassword } = user
    return { user: userWithoutPassword, accessToken, refreshToken }
  }

  /**
   * Register a new voter
   */
  async register(input: RegisterInput, device?: DeviceContext) {
    // Get name from masterlist (username should come from masterlist)
    const [masterlistEntry] = await db
      .select()
      .from(masterlist)
      .where(eq(masterlist.regNo, input.regNumber))
      .limit(1)

    if (!masterlistEntry) {
      throw new Error('Registration number not found in masterlist')
    }

    // Use name from masterlist as username (override input.username if provided)
    const username = masterlistEntry.name

    // Check if registration number already exists
    const [existingUser] = await db
      .select()
      .from(voters)
      .where(eq(voters.regNumber, input.regNumber))
      .limit(1)

    if (existingUser) {
      throw new Error('Registration number already exists')
    }

    // Optional one-time claim code. Administrators generate these per student;
    // once set, knowing a registration number is no longer enough to register.
    if (masterlistEntry.registrationCodeHash) {
      const code = input.claimCode?.trim()
      if (!code) {
        throw new Error('A registration code is required for this registration number')
      }
      if (hashRegistrationCode(code) !== masterlistEntry.registrationCodeHash) {
        throw new Error('Invalid registration code')
      }
    }

    // Check if username already exists
    const [existingUsername] = await db
      .select()
      .from(voters)
      .where(eq(voters.username, username))
      .limit(1)

    if (existingUsername) {
      throw new Error('Username already exists')
    }

    // Reject a device that is already tied to another account before creating
    // the new voter, so a failed policy check leaves no orphan account behind.
    if (device) {
      await deviceBindingService.assertDeviceAvailable(device.id)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10)

    // Create new voter
    const [newVoter] = await db
      .insert(voters)
      .values({
        username: username, // Use name from masterlist
        class: masterlistEntry.class,
        regNumber: input.regNumber,
        password: hashedPassword,
      })
      .returning()

    // Mark the masterlist entry as claimed so the lookup can report it.
    await db
      .update(masterlist)
      .set({ activated: true })
      .where(eq(masterlist.id, masterlistEntry.id))

    if (device) {
      await deviceBindingService.bind(newVoter.id, device.id, device.platform)
    }

    // Create JWT payload
    const jwtPayload: JwtPayload = {
      id: newVoter.id,
      regNumber: newVoter.regNumber,
      username: newVoter.username,
      classId: newVoter.class,
    }

    // Generate access token (short-lived: 15 minutes)
    const accessToken = await generateAccessToken(jwtPayload)
    
    // Generate and store refresh token (long-lived: 7 days)
    const refreshToken = await refreshTokenService.createRefreshToken(newVoter.id, jwtPayload)

    // Send welcome email (non-blocking - don't fail registration if email fails)
    const emailDomain = process.env.EMAIL_DOMAIN || 'echo-platform.local'
    const email = `${input.regNumber.replace(/\//g, '-')}@${emailDomain}`
    emailService.sendWelcomeEmail(email, username).catch((error) => {
      console.error('[AUTH SERVICE] Failed to send welcome email:', error)
      // Don't block registration if email fails
    })

    // Return user without password and tokens
    const { password, ...userWithoutPassword } = newVoter
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }
  }

  /**
   * Find user by registration number (for password reset)
   */
  async findByRegistrationNumber(regNumber: string) {
    const [user] = await db
      .select()
      .from(voters)
      .where(eq(voters.regNumber, regNumber))
      .limit(1)

    return user || null
  }

  /**
   * Refresh access token using refresh token
   * Supports both voters and admins
   */
  async refreshAccessToken(refreshToken: string) {
    // Verify refresh token first (this checks signature and expiration)
    const { verifyJwtToken, decodeJwtToken } = await import('../helpers/jwt.helpers')
    
    try {
      // Verify the token is valid
      await verifyJwtToken(refreshToken)
    } catch {
      throw new Error('Invalid refresh token')
    }
    
    // Decode to get user info
    const decoded = decodeJwtToken(refreshToken) as JwtPayload & { exp?: number }
    
    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new Error('Refresh token expired')
    }
    
    // Find the matching refresh token record to determine if it's an admin or voter
    const userTokens = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          or(
            eq(refreshTokens.voterId, decoded.id),
            eq(refreshTokens.adminId, decoded.id)
          ),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date())
        )
      )
    
    // Find the token that matches the hash
    let matchingToken = null
    for (const storedToken of userTokens) {
      try {
        const isValid = await bcrypt.compare(refreshToken, storedToken.tokenHash)
        if (isValid) {
          matchingToken = storedToken
          break
        }
      } catch (compareError) {
        // If bcrypt.compare fails (e.g., invalid hash format), log and continue
        console.error('[AUTH SERVICE] Error comparing token hash:', compareError)
        continue
      }
    }
    
    if (!matchingToken) {
      console.error('[AUTH SERVICE] No matching token found for user:', decoded.id)
      console.error('[AUTH SERVICE] Found tokens:', userTokens.length)
      throw new Error('Invalid or revoked refresh token')
    }
    
    // Determine if this is an admin or voter token
    // Check adminId first, then voterId
    const isAdmin = matchingToken.adminId !== null && matchingToken.adminId === decoded.id
    const isVoter = matchingToken.voterId !== null && matchingToken.voterId === decoded.id
    
    if (isAdmin) {
      // Fetch admin data
      const [admin] = await db
        .select()
        .from(admins)
        .where(eq(admins.id, decoded.id))
        .limit(1)
      
      if (!admin) {
        throw new Error('Admin not found')
      }
      
      // Create new JWT payload for admin
      const jwtPayload: JwtPayload = {
        id: admin.id,
        regNumber: admin.username, // Use username as regNumber for compatibility
        username: admin.username,
        classId: admin.id, // Placeholder - admins don't have classes
      }
      
      // Generate new access token
      const accessToken = await generateAccessToken(jwtPayload)
      
      // Return admin data
      const { password, ...adminWithoutPassword } = admin
      return {
        accessToken,
        admin: adminWithoutPassword,
        isAdmin: true,
      }
    } else if (isVoter) {
      // Fetch voter data
      const [user] = await db
        .select()
        .from(voters)
        .where(eq(voters.id, decoded.id))
        .limit(1)
      
      if (!user) {
        throw new Error('User not found')
      }
      
      // Create new JWT payload
      const jwtPayload: JwtPayload = {
        id: user.id,
        regNumber: user.regNumber,
        username: user.username,
        classId: user.class,
      }
      
      // Generate new access token
      const accessToken = await generateAccessToken(jwtPayload)
      
      return {
        accessToken,
        user: {
          id: user.id,
          regNumber: user.regNumber,
          username: user.username,
          class: user.class,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        isAdmin: false,
      }
    } else {
      // Token doesn't match either admin or voter - this shouldn't happen
      throw new Error('Invalid token: token does not match any user or admin')
    }
  }

  /**
   * Request password reset - generates a reset token and sends email
   */
  async requestPasswordReset(regNumber: string, email: string) {
    const user = await this.findByRegistrationNumber(regNumber)
    
    if (!user) {
      // Don't reveal if user exists (security best practice)
      return { success: true }
    }
    
    // Get user's name from masterlist for email personalization
    const [masterlistEntry] = await db
      .select()
      .from(masterlist)
      .where(eq(masterlist.regNo, regNumber))
      .limit(1)
    
    const userName = masterlistEntry?.name || user.username
    
    // Generate reset token
    const token = await passwordResetService.createResetToken(user.id)
    
    // Send password reset email to the provided email address
    const emailResult = await emailService.sendPasswordResetEmail(
      email,
      userName,
      token
    )
    
    if (!emailResult.success) {
      console.error('[AUTH SERVICE] Failed to send password reset email:', emailResult.message)
      // Still return success to user (don't reveal email failure)
      // In development, return token for testing
      if (process.env.NODE_ENV === 'development') {
        return { success: true, token, emailError: emailResult.message }
      }
    }
    
    // In development, return token for testing (remove in production)
    return process.env.NODE_ENV === 'development' 
      ? { success: true, token } 
      : { success: true }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(input: ResetPasswordInput) {
    // Verify token
    const voterId = await passwordResetService.verifyResetToken(input.token)
    
    if (!voterId) {
      throw new Error('Invalid or expired reset token')
    }
    
    // Find user
    const [user] = await db
      .select()
      .from(voters)
      .where(eq(voters.id, voterId))
      .limit(1)
    
    if (!user) {
      throw new Error('User not found')
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(input.password, 10)
    
    // Update password
    await db
      .update(voters)
      .set({ password: hashedPassword })
      .where(eq(voters.id, voterId))
    
    // Mark token as used
    await passwordResetService.markTokenAsUsed(input.token)
    
    return { success: true }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, input: ChangePasswordInput) {
    // Find user
    const [user] = await db
      .select()
      .from(voters)
      .where(eq(voters.id, userId))
      .limit(1)
    
    if (!user) {
      throw new Error('User not found')
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(input.currentPassword, user.password)
    if (!isValidPassword) {
      throw new Error('Current password is incorrect')
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(input.newPassword, 10)
    
    // Update password
    await db
      .update(voters)
      .set({ password: hashedPassword })
      .where(eq(voters.id, userId))
    
    return { success: true }
  }
}

export const authService = new AuthService()

