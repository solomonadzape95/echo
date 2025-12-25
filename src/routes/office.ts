import { Hono } from 'hono'
import { officeController } from '../controllers/office.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const office = new Hono()

// GET /office - Get all offices (public)
office.get('/', (c) => officeController.getAll(c))

// GET /office?electionId=xxx - Get offices by election (public)
office.get('/by-election', (c) => officeController.getByElection(c))

// GET /office/:id - Get office by ID (public)
office.get('/:id', (c) => officeController.getById(c))

// POST /office - Create new office (requires auth)
office.post('/', authMiddleware, (c) => officeController.create(c))

// PUT /office/:id - Update office (requires auth)
office.put('/:id', authMiddleware, (c) => officeController.update(c))

// DELETE /office/:id - Delete office (requires auth)
office.delete('/:id', authMiddleware, (c) => officeController.delete(c))

export default office

