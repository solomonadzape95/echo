import { z } from 'zod'

// Login validation schema
// Accepts either registration number (for voters) or username (for admins)
export const loginSchema = z.object({
  regNumber: z.string().min(1, 'Registration number or username is required'),
  password: z.string().min(1, 'Password is required'),
})

// Register validation schema
export const registerSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  regNumber: z.string().min(1, 'Registration number is required'),
  classId: z.string().uuid('Invalid class ID'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Forgot password validation schema
export const forgotPasswordSchema = z.object({
  regNumber: z.string().min(1, 'Registration number is required'),
  email: z.string().email('Please enter a valid email address'),
})

// Reset password validation schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Change password validation schema (for authenticated users)
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

