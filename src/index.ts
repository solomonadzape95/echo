import { Hono } from 'hono'
import voter from './routes/voter'
import admin from './routes/admin'
import candidate from './routes/candidate'
import department from './routes/department'
import faculty from './routes/faculty'
import election from './routes/election'
import classRoute from './routes/class'
import verifyEligibility from './routes/verify-eligibility'
import vote from './routes/vote'
import checkLedger from './routes/check-ledger'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/voter', voter)
app.route('/candidate', candidate)
app.route('/department', department)
app.route('/faculty', faculty)
app.route('/election', election)
app.route('/class', classRoute)
app.route('/admin', admin)
app.route('/verify-eligibility', verifyEligibility)
app.route('/vote', vote)
app.route('/check-ledger', checkLedger)

export default app
