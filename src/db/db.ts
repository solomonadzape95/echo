import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

// Supabase uses standard PostgreSQL connection strings
// Get your connection string from Supabase dashboard:
// Project Settings -> Database -> Connection string (use "Connection pooling" mode for better performance)
// It usually looks like: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true
const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Create connection pool with node-postgres
// Better connection pooling and stability than postgres-js
const pool = new Pool({
  connectionString,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  // Supabase-specific settings
  ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
})

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  // Don't exit process, just log - let the app handle it
})

// Create drizzle instance with node-postgres pool
// node-postgres supports transactions which we need for voting
export const db = drizzle(pool, {
  logger: process.env.NODE_ENV === 'development',
})

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