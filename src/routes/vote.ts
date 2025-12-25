import { Hono } from 'hono'
import { voteController } from '../controllers/vote.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const vote = new Hono()

// GET /vote - Get all votes (public)
vote.get('/', (c) => voteController.getAll(c))

// GET /vote?electionId=xxx - Get votes by election (public)
vote.get('/by-election', (c) => voteController.getByElection(c))

// GET /vote/verify-chain?electionId=xxx - Verify vote chain integrity (public)
vote.get('/verify-chain', (c) => voteController.verifyChain(c))

// GET /vote/:id - Get vote by ID (public)
vote.get('/:id', (c) => voteController.getById(c))

// POST /vote - Create new vote (requires auth)
vote.post('/', authMiddleware, (c) => voteController.create(c))

export default vote