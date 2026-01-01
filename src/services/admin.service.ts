import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { admins } from '../models/admin.schema'
import * as bcrypt from 'bcryptjs'
import { generateAccessToken } from '../helpers/jwt.helpers'
import { refreshTokenService } from './refreshToken.service'
import type { JwtPayload } from '../types/jwt.types'

export interface AdminLoginInput {
  username: string
  password: string
}

export interface CreateAdminInput {
  username: string
  email: string
  password: string
  role?: 'super_admin' | 'admin' | 'moderator'
  fullName?: string
}

export interface UpdateAdminInput {
  email?: string
  password?: string
  role?: 'super_admin' | 'admin' | 'moderator'
  fullName?: string
}

export class AdminService {
  /**
   * Authenticate an admin by username and password
   * Returns admin data and JWT token
   */
  async login(input: AdminLoginInput) {
    // Find admin by username
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, input.username))
      .limit(1)

    if (!admin) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, admin.password)
    if (!isValidPassword) {
      throw new Error('Invalid credentials')
    }

    // Create JWT payload (using username for admin identification)
    // Note: JWT payload requires classId, but admins don't have classes
    // We'll use admin ID as placeholder (won't be used for admins)
    const jwtPayload: JwtPayload = {
      id: admin.id,
      regNumber: admin.username, // Use username as regNumber for compatibility
      username: admin.username,
      classId: admin.id, // Placeholder - admins don't have classes
    }

    // Generate access token (short-lived: 15 minutes)
    const accessToken = await generateAccessToken(jwtPayload)
    
    // Generate and store refresh token (long-lived: 7 days)
    const refreshToken = await refreshTokenService.createRefreshToken(admin.id, jwtPayload, true)

    // Return admin (without password) and tokens
    const { password, ...adminWithoutPassword } = admin
    return {
      admin: adminWithoutPassword,
      accessToken,
      refreshToken,
    }
  }

  /**
   * Create a new admin account
   */
  async create(input: CreateAdminInput) {
    // Check if username already exists
    const [existingUsername] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, input.username))
      .limit(1)

    if (existingUsername) {
      throw new Error('Username already exists')
    }

    // Check if email already exists
    const [existingEmail] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, input.email))
      .limit(1)

    if (existingEmail) {
      throw new Error('Email already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10)

    // Create new admin
    const [newAdmin] = await db
      .insert(admins)
      .values({
        username: input.username,
        email: input.email,
        password: hashedPassword,
        role: input.role || 'admin',
        fullName: input.fullName || null,
      })
      .returning()

    if (!newAdmin) {
      throw new Error('Failed to create admin')
    }

    // Return admin without password
    const { password, ...adminWithoutPassword } = newAdmin
    return adminWithoutPassword
  }

  /**
   * Get all admins
   */
  async getAll() {
    const allAdmins = await db
      .select({
        id: admins.id,
        username: admins.username,
        email: admins.email,
        role: admins.role,
        fullName: admins.fullName,
        createdAt: admins.createdAt,
        updatedAt: admins.updatedAt,
      })
      .from(admins)

    return allAdmins
  }

  /**
   * Get admin by ID
   */
  async getById(id: string) {
    const [admin] = await db
      .select({
        id: admins.id,
        username: admins.username,
        email: admins.email,
        role: admins.role,
        fullName: admins.fullName,
        createdAt: admins.createdAt,
        updatedAt: admins.updatedAt,
      })
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1)

    if (!admin) {
      throw new Error('Admin not found')
    }

    return admin
  }

  /**
   * Get admin by username
   */
  async getByUsername(username: string) {
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1)

    if (!admin) {
      throw new Error('Admin not found')
    }

    const { password, ...adminWithoutPassword } = admin
    return adminWithoutPassword
  }

  /**
   * Update admin
   */
  async update(id: string, input: UpdateAdminInput) {
    // Check if admin exists
    const [existing] = await db
      .select()
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Admin not found')
    }

    // Check if email is being changed and if it's already taken
    if (input.email && input.email !== existing.email) {
      const [emailExists] = await db
        .select()
        .from(admins)
        .where(eq(admins.email, input.email))
        .limit(1)

      if (emailExists) {
        throw new Error('Email already exists')
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (input.email !== undefined) updateData.email = input.email
    if (input.role !== undefined) updateData.role = input.role
    if (input.fullName !== undefined) updateData.fullName = input.fullName
    if (input.password !== undefined) {
      // Hash new password
      updateData.password = await bcrypt.hash(input.password, 10)
    }

    // Update admin
    const [updated] = await db
      .update(admins)
      .set(updateData)
      .where(eq(admins.id, id))
      .returning()

    if (!updated) {
      throw new Error('Failed to update admin')
    }

    // Return admin without password
    const { password, ...adminWithoutPassword } = updated
    return adminWithoutPassword
  }

  /**
   * Delete admin
   */
  async delete(id: string) {
    // Check if admin exists
    const [existing] = await db
      .select()
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1)

    if (!existing) {
      throw new Error('Admin not found')
    }

    // Prevent deleting yourself (check in controller)
    await db
      .delete(admins)
      .where(eq(admins.id, id))

    return { success: true }
  }
}

export const adminService = new AdminService()

