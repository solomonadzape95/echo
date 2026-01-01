import { Hono } from 'hono'
import { statsController } from '../controllers/stats.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const stats = new Hono()

// GET /stats - Get overall statistics (all elections)
stats.get('/', (c) => statsController.getOverallStats(c))

// GET /stats/election/:electionId - Get statistics for a specific election
stats.get('/election/:electionId', (c) => statsController.getElectionStats(c))

// GET /stats/voter/:voterId - Get voting participation for a voter (requires auth)
stats.get('/voter/:voterId', authMiddleware, (c) => statsController.getVoterParticipation(c))

// GET /stats/voter/:voterId/election/:electionId - Check if voter has voted (requires auth)
stats.get('/voter/:voterId/election/:electionId', authMiddleware, (c) => statsController.checkVoterVoted(c))

export default stats

