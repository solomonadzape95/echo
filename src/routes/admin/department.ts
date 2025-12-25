import { Hono } from 'hono'
import { departmentController } from '../../controllers/department.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const department = new Hono()

// All admin routes require admin authentication
department.use('*', adminMiddleware)

// GET /admin/department - Get all departments
department.get('/', (c) => departmentController.getAll(c))

// GET /admin/department/by-faculty - Get departments by faculty
department.get('/by-faculty', (c) => departmentController.getByFaculty(c))

// GET /admin/department/:id - Get department by ID
department.get('/:id', (c) => departmentController.getById(c))

// POST /admin/department - Create new department
department.post('/', (c) => departmentController.create(c))

// PUT /admin/department/:id - Update department
department.put('/:id', (c) => departmentController.update(c))

// DELETE /admin/department/:id - Delete department
department.delete('/:id', (c) => departmentController.delete(c))

export default department