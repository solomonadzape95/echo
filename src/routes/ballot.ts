import { Hono } from 'hono'
import { ballotController } from '../controllers/ballot.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const ballot = new Hono()

// GET /ballot?electionId=xxx - Get ballot data (requires auth and eligibility check)
ballot.get('/', authMiddleware, (c) => ballotController.getBallot(c))

export default ballot

