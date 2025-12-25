import { Hono } from 'hono'
import { tokenController } from '../controllers/token.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const token = new Hono()

// GET /token - Get all tokens (public)
token.get('/', (c) => tokenController.getAll(c))

// GET /token?electionId=xxx - Get tokens by election (public)
token.get('/by-election', (c) => tokenController.getByElection(c))

// GET /token/unused?electionId=xxx - Get unused tokens by election (public)
token.get('/unused', (c) => tokenController.getUnusedByElection(c))

// GET /token/:id - Get token by ID (public)
token.get('/:id', (c) => tokenController.getById(c))

// POST /token - Create new token (requires auth)
token.post('/', authMiddleware, (c) => tokenController.create(c))

// PUT /token/:id - Update token (requires auth)
token.put('/:id', authMiddleware, (c) => tokenController.update(c))

// PUT /token/:id/use - Mark token as used (requires auth)
token.put('/:id/use', authMiddleware, (c) => tokenController.markAsUsed(c))

// DELETE /token/:id - Delete token (requires auth)
token.delete('/:id', authMiddleware, (c) => tokenController.delete(c))

export default token

