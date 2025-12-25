import { Hono } from 'hono'
import { departmentController } from '../controllers/department.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const department = new Hono()

// GET /department - Get all departments (public)
department.get('/', (c) => departmentController.getAll(c))

// GET /department?facultyId=xxx - Get departments by faculty (public)
department.get('/by-faculty', (c) => departmentController.getByFaculty(c))

// GET /department/:id - Get department by ID (public)
department.get('/:id', (c) => departmentController.getById(c))

// POST /department - Create new department (requires auth)
department.post('/', authMiddleware, (c) => departmentController.create(c))

// PUT /department/:id - Update department (requires auth)
department.put('/:id', authMiddleware, (c) => departmentController.update(c))

// DELETE /department/:id - Delete department (requires auth)
department.delete('/:id', authMiddleware, (c) => departmentController.delete(c))

export default department