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
import storage, { adminStorage } from './routes/storage'
import ra from './routes/ra'
import appRelease from './routes/app'
import notifications from './routes/notifications'
import { electionService } from './services/election.service'
import { chainService } from './services/chain.service'
import { ensureSchema } from './db/ensureSchema'

// Safety net for hosted databases that missed a pre-deploy migration.
await ensureSchema().catch((error) => {
  console.error('[SCHEMA] Could not ensure admin schema:', error?.message || error)
})

const app = new Hono()

// Browser origins allowed to call the API. `FRONTEND_URL` is the production
// web client; `CORS_ORIGINS` is an optional comma-separated extra list.
const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS?.split(',') ?? []),
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]
  .map((origin) => origin?.trim().replace(/\/$/, ''))
  .filter((origin): origin is string => !!origin)

// Configure CORS
app.use('*', cors({
  origin: (origin) => {
    // Native apps and curl do not send an Origin header.
    if (!origin) return '*'

    const normalized = origin.replace(/\/$/, '')
    if (configuredOrigins.includes(normalized)) {
      return origin
    }

    // Vercel preview deployments use wildcard subdomains.
    if (process.env.NODE_ENV === 'production' && normalized.endsWith('.vercel.app')) {
      return origin
    }

    // Development: allow the local tools.
    if (process.env.NODE_ENV !== 'production') {
      return origin
    }

    return undefined
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Client-Platform',
    'X-Device-Id',
    'X-Device-Platform',
  ],
  exposeHeaders: ['Content-Length', 'Retry-After'],
  credentials: true,
  maxAge: 86400,
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
app.route('/storage', storage)
app.route('/admin/storage', adminStorage)
app.route('/notifications', notifications)
app.route('/ra', ra)
app.route('/app', appRelease)

// For Bun's --hot flag, export server config instead of calling Bun.serve()
// This allows hot reloading to work properly
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001

// Close elections and publish results even when nobody is using the app.
// Requests also trigger this, but a finished election should publish without
// waiting for someone to open a page.
const electionTickMs = Number(
  process.env.ELECTION_STATUS_INTERVAL_MS ?? process.env.ELECTION_TICK_MS ?? 60_000
)
const scheduler = globalThis as typeof globalThis & {
  __echoElectionTicker?: ReturnType<typeof setInterval>
  __echoStatusTimer?: ReturnType<typeof setInterval>
  __echoChainTicker?: ReturnType<typeof setInterval>
}

if (
  process.env.ELECTION_TICKER !== 'false' &&
  electionTickMs > 0 &&
  !scheduler.__echoElectionTicker &&
  !scheduler.__echoStatusTimer
) {
  const tick = () => {
    electionService.updateElectionStatuses().catch((error) => {
      console.error('[ELECTION TICKER] Failed to refresh election statuses:', error?.message || error)
    })
  }
  // Catch elections that ended while the server was down.
  tick()
  const timer = setInterval(tick, electionTickMs)
  scheduler.__echoElectionTicker = timer
  scheduler.__echoStatusTimer = timer
  console.log(`⏱️  Election ticker running every ${electionTickMs}ms`)
}

const chainSyncMs = Number(process.env.CHAIN_SYNC_INTERVAL_MS ?? 120_000)
if (
  process.env.CHAIN_SYNC_TICKER !== 'false' &&
  chainSyncMs > 0 &&
  chainService.isEnabled() &&
  !scheduler.__echoChainTicker
) {
  scheduler.__echoChainTicker = setInterval(() => {
    chainService.syncPendingElections().catch((error) => {
      console.error('[CHAIN SYNC] Failed:', error?.message || error)
    })
  }, chainSyncMs)
  console.log(`⛓️  Chain sync running every ${chainSyncMs}ms`)
}

console.log(`🚀 Server starting on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
