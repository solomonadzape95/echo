import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import voter from './routes/voter'
import admin from './routes/admin'
import candidate from './routes/candidate'
import department from './routes/department'
import faculty from './routes/faculty'
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

const app = new Hono()

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
app.route('/department', department)
app.route('/faculty', faculty)
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

export default app
