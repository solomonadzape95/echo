import { Hono } from 'hono'
import { issuanceController } from '../controllers/issuance.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const issuance = new Hono()

// GET /issuance - Get all issuances (public)
issuance.get('/', (c) => issuanceController.getAll(c))

// GET /issuance/:id - Get issuance by ID (public)
issuance.get('/:id', (c) => issuanceController.getOne(c))

// POST /issuance - Create new issuance (requires auth)
issuance.post('/', authMiddleware, (c) => issuanceController.create(c))

export default issuance

