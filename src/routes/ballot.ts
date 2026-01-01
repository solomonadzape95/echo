import { Hono } from 'hono'
import { ballotController } from '../controllers/ballot.controller'

const ballot = new Hono()

// GET /ballot?electionId=xxx - Get ballot data (public)
ballot.get('/', (c) => ballotController.getBallot(c))

export default ballot

