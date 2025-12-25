import {neon} from '@neondatabase/serverless'
import {drizzle} from 'drizzle-orm/neon-serverless'

// Use neon-serverless for transaction support (neon-http doesn't support transactions)
// Pass connection string directly to drizzle for neon-serverless
export const db = drizzle(process.env.DATABASE_URL!)

// Also export the query function for raw SQL if needed
export const sqlClient = neon(process.env.DATABASE_URL!)

// Helper to generate short receipt codes
export function generateReceiptCode(): string {
  // Generate a short alphanumeric code (8 characters)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}