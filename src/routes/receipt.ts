import { Hono } from 'hono'
import { receiptController } from '../controllers/receipt.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const receipt = new Hono()

// GET /receipt - Get all receipts (public)
receipt.get('/', (c) => receiptController.getAll(c))

// POST /receipt - Create new receipt (requires auth)
receipt.post('/', authMiddleware, (c) => receiptController.create(c))

export default receipt

