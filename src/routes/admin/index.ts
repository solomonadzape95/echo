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

const admin = new Hono()
// Routes are mounted at /admin in main app, so no basePath needed here

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

export default admin