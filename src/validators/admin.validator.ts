import { z } from 'zod'

// Admin login validation schema
export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// Create admin validation schema
export const createAdminSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['super_admin', 'admin', 'moderator']).optional(),
  fullName: z.string().optional(),
})

// Update admin validation schema
export const updateAdminSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['super_admin', 'admin', 'moderator']).optional(),
  fullName: z.string().optional(),
})

// Get admin by ID schema
export const adminIdSchema = z.object({
  id: z.string().uuid('Invalid admin ID'),
})

// Type exports
export type AdminLoginInput = z.infer<typeof adminLoginSchema>
export type CreateAdminInput = z.infer<typeof createAdminSchema>
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>
export type AdminIdInput = z.infer<typeof adminIdSchema>

