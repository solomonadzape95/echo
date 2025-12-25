import { Hono } from 'hono'
import { candidateController } from '../controllers/candidate.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const candidate = new Hono()

// Public routes (no auth required)
// GET /candidate - Get all candidates
candidate.get('/', (c) => candidateController.getAll(c))

// GET /candidate?officeId=xxx - Get candidates by office
candidate.get('/by-office', (c) => candidateController.getByOffice(c))

// GET /candidate/:id - Get candidate by ID
candidate.get('/:id', (c) => candidateController.getById(c))

// Protected routes (auth required)
// POST /candidate - Create new candidate (requires auth)
candidate.post('/', authMiddleware, (c) => candidateController.create(c))

// PUT /candidate/:id - Update candidate (requires auth)
candidate.put('/:id', authMiddleware, (c) => candidateController.update(c))

// DELETE /candidate/:id - Delete candidate (requires auth)
candidate.delete('/:id', authMiddleware, (c) => candidateController.delete(c))

export default candidate