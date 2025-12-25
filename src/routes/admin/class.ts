import { Hono } from 'hono'
import { classController } from '../../controllers/class.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const classRoute = new Hono()

// All admin routes require admin authentication
classRoute.use('*', adminMiddleware)

// GET /admin/class - Get all classes
classRoute.get('/', (c) => classController.getAll(c))

// GET /admin/class/:id - Get class by ID
classRoute.get('/:id', (c) => classController.getById(c))

// POST /admin/class - Create new class
classRoute.post('/', (c) => classController.create(c))

// PUT /admin/class/:id - Update class
classRoute.put('/:id', (c) => classController.update(c))

// DELETE /admin/class/:id - Delete class
classRoute.delete('/:id', (c) => classController.delete(c))

export default classRoute