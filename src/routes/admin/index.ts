import { Hono } from 'hono'
import classRoute from './class'
import electionRoute from './election'
import voterRoute from './voter'
import departmentRoute from './department'
import candidateRoute from './candidate'
import facultyRoute from './faculty'
import masterlistRoute from './masterlist'

const admin = new Hono()
// Routes are mounted at /admin in main app, so no basePath needed here

admin.route("/class", classRoute)
admin.route("/election", electionRoute)
admin.route("/voter", voterRoute)
admin.route("/department", departmentRoute)
admin.route("/candidate", candidateRoute)
admin.route("/faculty", facultyRoute)
admin.route("/masterlist", masterlistRoute)

export default admin