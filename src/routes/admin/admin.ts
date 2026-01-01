import { Hono } from 'hono'
import { adminController } from '../../controllers/admin.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const admin = new Hono()

// All admin management routes require admin authentication
admin.use('*', adminMiddleware)

// GET /admin/admin - Get all admins
admin.get('/', (c) => adminController.getAll(c))

// GET /admin/admin/:id - Get admin by ID
admin.get('/:id', (c) => adminController.getById(c))

// POST /admin/admin - Create new admin
admin.post('/', (c) => adminController.create(c))

// PUT /admin/admin/:id - Update admin
admin.put('/:id', (c) => adminController.update(c))

// DELETE /admin/admin/:id - Delete admin
admin.delete('/:id', (c) => adminController.delete(c))

export default admin

