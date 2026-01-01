import { eq, and, isNull, gt, or } from 'drizzle-orm'
import { db } from '../db/db'
import { voters } from '../models/voter.schema'
import { admins } from '../models/admin.schema'
import { refreshTokens } from '../models/refreshToken.schema'
import { masterlist } from '../models/masterlist.schema'
import type { LoginInput, RegisterInput } from '../validators/auth.validator'
import * as bcrypt from 'bcryptjs'
import { generateAccessToken } from '../helpers/jwt.helpers'
import { refreshTokenService } from './refreshToken.service'
import type { JwtPayload } from '../types/jwt.types'


export class AuthService {
  /**
   * Authenticate a user by registration number and password
   * Returns user data and JWT token
   */
  async login(input: LoginInput) {
    // Find user by registration number
    const [user] = await db
      .select()
      .from(voters)
      .where(eq(voters.regNumber, input.regNumber))
      .limit(1)

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.password)
    if (!isValidPassword) {
      throw new Error('Invalid credentials')
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
   * Register a new voter
   */
  async register(input: RegisterInput) {
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

    // Check if username already exists
    const [existingUsername] = await db
      .select()
      .from(voters)
      .where(eq(voters.username, username))
      .limit(1)

    if (existingUsername) {
      throw new Error('Username already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10)

    // Create new voter
    const [newVoter] = await db
      .insert(voters)
      .values({
        username: username, // Use name from masterlist
        class: input.classId,
        regNumber: input.regNumber,
        password: hashedPassword,
      })
      .returning()

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
      const isValid = await bcrypt.compare(refreshToken, storedToken.tokenHash)
      if (isValid) {
        matchingToken = storedToken
        break
      }
    }
    
    if (!matchingToken) {
      throw new Error('Invalid or revoked refresh token')
    }
    
    // Determine if this is an admin or voter token
    const isAdmin = matchingToken.adminId !== null && matchingToken.adminId === decoded.id
    
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
    } else {
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
    }
  }
}

export const authService = new AuthService()

