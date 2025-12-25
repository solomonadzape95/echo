import { Hono } from 'hono'
import { masterlistController } from '../../controllers/masterlist.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const masterlist = new Hono()

// All admin routes require admin authentication
masterlist.use('*', adminMiddleware)

// GET /admin/masterlist - Get all masterlist entries (with optional filters: ?classId=xxx&activated=true)
masterlist.get('/', (c) => masterlistController.getAll(c))

// POST /admin/masterlist/upload - Upload masterlist (CSV/JSON array of students)
masterlist.post('/upload', (c) => masterlistController.upload(c))

// POST /admin/masterlist/activate - Activate a student
masterlist.post('/activate', (c) => masterlistController.activate(c))

// POST /admin/masterlist/deactivate - Deactivate a student
masterlist.post('/deactivate', (c) => masterlistController.deactivate(c))

export default masterlist

