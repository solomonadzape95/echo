import { Hono } from 'hono'
import { facultyController } from '../../controllers/faculty.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const faculty = new Hono()

// All admin routes require admin authentication
faculty.use('*', adminMiddleware)

// GET /admin/faculty - Get all faculties
faculty.get('/', (c) => facultyController.getAll(c))

// GET /admin/faculty/:id - Get faculty by ID
faculty.get('/:id', (c) => facultyController.getById(c))

// POST /admin/faculty - Create new faculty
faculty.post('/', (c) => facultyController.create(c))

// PUT /admin/faculty/:id - Update faculty
faculty.put('/:id', (c) => facultyController.update(c))

// DELETE /admin/faculty/:id - Delete faculty
faculty.delete('/:id', (c) => facultyController.delete(c))

export default faculty