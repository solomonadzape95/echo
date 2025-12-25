import { Hono } from 'hono'
import { facultyController } from '../controllers/faculty.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const faculty = new Hono()

// GET /faculty - Get all faculties (public)
faculty.get('/', (c) => facultyController.getAll(c))

// GET /faculty/:id - Get faculty by ID (public)
faculty.get('/:id', (c) => facultyController.getById(c))

// POST /faculty - Create new faculty (requires auth)
faculty.post('/', authMiddleware, (c) => facultyController.create(c))

// PUT /faculty/:id - Update faculty (requires auth)
faculty.put('/:id', authMiddleware, (c) => facultyController.update(c))

// DELETE /faculty/:id - Delete faculty (requires auth)
faculty.delete('/:id', authMiddleware, (c) => facultyController.delete(c))

export default faculty