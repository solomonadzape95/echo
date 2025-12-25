import { Hono } from 'hono'
import { candidateController } from '../../controllers/candidate.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const candidate = new Hono()

// All admin routes require admin authentication
candidate.use('*', adminMiddleware)

// GET /admin/candidate - Get all candidates
candidate.get('/', (c) => candidateController.getAll(c))

// GET /admin/candidate/by-office - Get candidates by office
candidate.get('/by-office', (c) => candidateController.getByOffice(c))

// GET /admin/candidate/:id - Get candidate by ID
candidate.get('/:id', (c) => candidateController.getById(c))

// POST /admin/candidate - Create new candidate
candidate.post('/', (c) => candidateController.create(c))

// PUT /admin/candidate/:id - Update candidate
candidate.put('/:id', (c) => candidateController.update(c))

// DELETE /admin/candidate/:id - Delete candidate
candidate.delete('/:id', (c) => candidateController.delete(c))

export default candidate