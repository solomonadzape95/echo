import { z } from 'zod'

// Login validation schema
export const loginSchema = z.object({
  regNumber: z.string().min(1, 'Registration number is required'),
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
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

