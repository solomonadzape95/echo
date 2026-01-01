import { Hono } from 'hono'
import { statsController } from '../../controllers/stats.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const stats = new Hono()

// All admin routes require admin authentication
stats.use('*', adminMiddleware)

// GET /admin/stats - Get overall statistics (admin only)
stats.get('/', (c) => statsController.getOverallStats(c))

// GET /admin/stats/election/:electionId - Get statistics for a specific election (admin only)
stats.get('/election/:electionId', (c) => statsController.getElectionStats(c))

// GET /admin/stats/voter/:voterId - Get voting participation for a voter (admin only)
stats.get('/voter/:voterId', (c) => statsController.getVoterParticipation(c))

// GET /admin/stats/voter/:voterId/election/:electionId - Check if voter has voted (admin only)
stats.get('/voter/:voterId/election/:electionId', (c) => statsController.checkVoterVoted(c))

export default stats

