import { Hono } from 'hono'
import classRoute from './class'
import electionRoute from './election'
import voterRoute from './voter'
import candidateRoute from './candidate'
import masterlistRoute from './masterlist'
import officeRoute from './office'
import statsRoute from './stats'
import adminRoute from './admin'
import authRoute from './auth'
import governanceRoute from './governance'
import chainRoute from './chain'
import maintenanceRoute from './maintenance'
import auditRoute from './audit'
import { auditLogService } from '../../services/auditLog.service'

const admin = new Hono()
// Routes are mounted at /admin in main app, so no basePath needed here

// Durable audit trail for every mutating admin request. GETs are not logged.
admin.use('*', async (c, next) => {
  const method = c.req.method
  await next()

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return
  if (c.req.path.startsWith('/admin/auth')) return

  const actor = (c as any).get('admin') as
    | { id?: string; username?: string }
    | undefined

  if (!actor) return

  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    null

  void auditLogService.record({
    adminId: actor.id,
    adminUsername: actor.username,
    method,
    path: c.req.path,
    status: c.res.status,
    ip,
    userAgent: c.req.header('user-agent') ?? null,
  })
})


admin.route("/auth", authRoute) // Admin authentication routes (login, etc.)
admin.route("/class", classRoute)
admin.route("/election", electionRoute)
admin.route("/voter", voterRoute)
admin.route("/candidate", candidateRoute)
admin.route("/masterlist", masterlistRoute)
admin.route("/office", officeRoute)
admin.route("/stats", statsRoute)
admin.route("/admin", adminRoute) // Admin management routes
admin.route("/governance", governanceRoute) // Threshold multi-signature governance
admin.route("/chain", chainRoute) // Optional on-chain ledger mirror
admin.route("/maintenance", maintenanceRoute) // Data summary and destructive reset
admin.route("/audit", auditRoute) // Durable admin action log

export default admin