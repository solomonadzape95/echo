import { Hono } from 'hono'
import { receiptController } from '../controllers/receipt.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const receipt = new Hono()

// GET /receipt?code=xxx - Get receipt by code with vote details (public - for verification)
receipt.get('/', (c) => receiptController.getByCode(c))

// GET /receipt/all - Get all receipts (public)
receipt.get('/all', (c) => receiptController.getAll(c))

// POST /receipt - Create new receipt (requires auth)
receipt.post('/', authMiddleware, (c) => receiptController.create(c))

export default receipt

