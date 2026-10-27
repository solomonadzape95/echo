import { Hono } from 'hono'
import { receiptController } from '../controllers/receipt.controller'
import { adminMiddleware } from '../middleware/admin.middleware'

const receipt = new Hono()

// GET /receipt?code=xxx - Get receipt by code with vote details (public - for verification)
receipt.get('/', (c) => receiptController.getByCode(c))

// GET /receipt/all - Exposes every receipt code/vote hash. Admin only.
receipt.get('/all', adminMiddleware, (c) => receiptController.getAll(c))

// POST /receipt - Receipts are created by the vote service, never by clients.
receipt.post('/', adminMiddleware, (c) => receiptController.create(c))

export default receipt
