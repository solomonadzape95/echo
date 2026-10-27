import { Hono } from 'hono'
import { masterlistController } from '../../controllers/masterlist.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const masterlist = new Hono()

// All admin routes require admin authentication
masterlist.use('*', adminMiddleware)

// GET /admin/masterlist?page=&limit=&search=&classId=&activated=
masterlist.get('/', (c) => masterlistController.getAll(c))

// POST /admin/masterlist/upload - CSV (multipart) or JSON array of students
masterlist.post('/upload', (c) => masterlistController.upload(c))

// POST /admin/masterlist/activate - Activate a student
masterlist.post('/activate', (c) => masterlistController.activate(c))

// POST /admin/masterlist/deactivate - Deactivate a student
masterlist.post('/deactivate', (c) => masterlistController.deactivate(c))

// POST /admin/masterlist/activate-all - Activate every pending entry (optional classId)
masterlist.post('/activate-all', (c) => masterlistController.activateAll(c))

// DELETE /admin/masterlist/:id - Remove a student from the masterlist
masterlist.delete('/:id', (c) => masterlistController.remove(c))

export default masterlist
