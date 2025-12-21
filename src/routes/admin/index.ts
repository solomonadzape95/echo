import { Hono } from 'hono'
import classRoute from './class'
import electionRoute from './election'
import voterRoute from './voter'
import departmentRoute from './department'
import candidateRoute from './candidate'
import facultyRoute from './faculty'

const admin = new Hono().basePath("/admin")

admin.route("/class", classRoute)
admin.route("/election", electionRoute)
admin.route("/voter", voterRoute)
admin.route("/department", departmentRoute)
admin.route("/candidate", candidateRoute)
admin.route("/faculty", facultyRoute)

export default admin