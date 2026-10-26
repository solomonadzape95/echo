import { z } from 'zod'

// Login validation schema
// Accepts either registration number (for voters) or username (for admins)
export const loginSchema = z.object({
  regNumber: z.string().min(1, 'Registration number or username is required'),
  password: z.string().min(1, 'Password is required'),
})

// Register validation schema
// The mobile registration flow sends only the reg number, password and an
// optional claim code. `username`/`classId` stay optional for older clients;
// the server always derives both from the masterlist so they cannot be spoofed.
export const registerSchema = z.object({
  username: z.union([z.string().min(1), z.literal('')]).optional(),
  regNumber: z.string().min(1, 'Registration number is required'),
  classId: z.union([z.string().uuid('Invalid class ID'), z.literal('')]).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  claimCode: z.string().max(64).optional(),
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

