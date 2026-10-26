import { Hono } from 'hono'
import { raController } from '../controllers/ra.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const ra = new Hono()

// GET /ra/public-key - Public RA public key + RFC 9474 variant
ra.get('/public-key', (c) => raController.getPublicKey(c))

// POST /ra/sign - Blind-sign a token payload (requires auth)
ra.post('/sign', authMiddleware, (c) => raController.sign(c))

export default ra
