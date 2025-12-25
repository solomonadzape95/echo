import { Hono } from 'hono'
import { classController } from '../controllers/class.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const classRoute = new Hono()

// GET /class - Get all classes (public)
classRoute.get('/', (c) => classController.getAll(c))

// GET /class/:id - Get class by ID (public)
classRoute.get('/:id', (c) => classController.getById(c))

// POST /class - Create new class (requires auth)
classRoute.post('/', authMiddleware, (c) => classController.create(c))

// PUT /class/:id - Update class (requires auth)
classRoute.put('/:id', authMiddleware, (c) => classController.update(c))

// DELETE /class/:id - Delete class (requires auth)
classRoute.delete('/:id', authMiddleware, (c) => classController.delete(c))

export default classRoute