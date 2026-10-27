import { Hono } from 'hono'
import { voteController } from '../controllers/vote.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { adminMiddleware } from '../middleware/admin.middleware'

const vote = new Hono()

// GET /vote/verify-chain?electionId=xxx - Verify vote chain integrity (public: returns validity only)
vote.get('/verify-chain', (c) => voteController.verifyChain(c))

// GET /vote/chain-status?electionId=xxx - On-chain mirror status (public, anonymous data)
vote.get('/chain-status', (c) => voteController.getChainStatus(c))

// GET /vote/by-election?electionId=xxx - Chain-linking data for an authenticated voter (safe subset)
vote.get('/by-election', authMiddleware, (c) => voteController.getByElection(c))

// GET /vote/status?electionId=xxx - Eligibility + has-voted status (authenticated)
vote.get('/status', authMiddleware, (c) => voteController.getStatus(c))

// GET /vote - Get all votes (admin only; full rows)
vote.get('/', adminMiddleware, (c) => voteController.getAll(c))

// GET /vote/:id - Get vote by ID (admin only; full row)
vote.get('/:id', adminMiddleware, (c) => voteController.getById(c))

// POST /vote - Create new vote (requires auth)
vote.post('/', authMiddleware, (c) => voteController.create(c))

export default vote
