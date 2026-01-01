import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'
import voter from './routes/voter'
import admin from './routes/admin'
import candidate from './routes/candidate'
import election from './routes/election'
import office from './routes/office'
import classRoute from './routes/class'
import verifyEligibility from './routes/verify-eligibility'
import vote from './routes/vote'
import checkLedger from './routes/check-ledger'
import receipt from './routes/receipt'
import issuance from './routes/issuance'
import token from './routes/token'
import auth from './routes/auth'
import masterlist from './routes/masterlist'
import dashboard from './routes/dashboard'
import profile from './routes/profile'
import ballot from './routes/ballot'
import stats from './routes/stats'
import enumRoute from './routes/enum'
import officeTemplate from './routes/office-template'
import storage from './routes/storage'

const app = new Hono()

// Configure CORS
app.use('*', cors({
  origin: (origin) => {
    // Allow requests from frontend dev server
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      // Add production origins here when deploying
      // 'https://yourdomain.com',
    ]
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return '*'
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return origin
    }
    
    // Default: allow all origins in development
    // In production, you might want to return undefined to deny
    return process.env.NODE_ENV === 'production' ? undefined : origin
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  credentials: true, // Allow cookies to be sent
  maxAge: 86400, // 24 hours
}))

// Add request logging middleware (must be before routes)
app.use('*', async (c, next) => {
  const start = Date.now()
  const method = c.req.method
  const path = c.req.path
  const url = c.req.url
  
  console.log(`[${new Date().toISOString()}] ${method} ${url}`)
  
  try {
    await next()
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${method} ${path} - ${c.res.status} (${duration}ms)`)
  } catch (error: any) {
    const duration = Date.now() - start
    console.error(`[${new Date().toISOString()}] ${method} ${path} - ERROR (${duration}ms):`, error)
    throw error
  }
})

// Add error handler
app.onError((err, c) => {
  console.error('[ERROR HANDLER]', err)
  return c.json({
    success: false,
    message: err.message || 'Internal server error',
  }, 500)
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// Health check endpoint
app.get('/health', async (c) => {
  try {
    // Basic health check - server is running
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'echo-voting-api',
    }

    // Optional: Check database connectivity
    try {
      const { db } = await import('./db/db')
      // Simple query to verify database connection
      await db.execute(sql`SELECT 1`)
      return c.json({ ...health, database: 'connected' }, 200)
    } catch (dbError: any) {
      // Server is healthy but database is not
      return c.json(
        {
          ...health,
          database: 'disconnected',
          error: dbError.message,
        },
        503 // Service Unavailable
      )
    }
  } catch (error: any) {
    return c.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      500
    )
  }
})

app.route('/voter', voter)
app.route('/candidate', candidate)
app.route('/election', election)
app.route('/office', office)
app.route('/class', classRoute)
app.route('/admin', admin)
app.route('/verify-eligibility', verifyEligibility)
app.route('/vote', vote)
app.route('/check-ledger', checkLedger)
app.route('/receipt', receipt)
app.route('/issuance', issuance)
app.route('/token', token)
app.route('/auth', auth)
app.route('/masterlist', masterlist)
app.route('/dashboard', dashboard)
app.route('/profile', profile)
app.route('/ballot', ballot)
app.route('/stats', stats)
app.route('/enum', enumRoute)
app.route('/office-templates', officeTemplate)
app.route('/admin/storage', storage)

// For Bun's --hot flag, export server config instead of calling Bun.serve()
// This allows hot reloading to work properly
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001

console.log(`🚀 Server starting on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
