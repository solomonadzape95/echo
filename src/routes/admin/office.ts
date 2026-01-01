import { Hono } from 'hono'
import { officeController } from '../../controllers/office.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const office = new Hono()

// All admin routes require admin authentication
office.use('*', adminMiddleware)

// GET /admin/office - Get all offices
office.get('/', (c) => officeController.getAll(c))

// GET /admin/office/by-election - Get offices by election
office.get('/by-election', (c) => officeController.getByElection(c))

// GET /admin/office/:id - Get office by ID
office.get('/:id', (c) => officeController.getById(c))

// POST /admin/office - Create new office
office.post('/', (c) => officeController.create(c))

// PUT /admin/office/:id - Update office
office.put('/:id', (c) => officeController.update(c))

// DELETE /admin/office/:id - Delete office
office.delete('/:id', (c) => officeController.delete(c))

export default office

