import { Hono } from 'hono'
import { raController } from '../controllers/ra.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const ra = new Hono()

// GET /ra/public-key - Public RA public key + RFC 9474 variant
ra.get('/public-key', (c) => raController.getPublicKey(c))

// Blind-signature playground key (ephemeral, not the election RA key)
ra.get('/demo/public-key', (c) => raController.getDemoPublicKey(c))
ra.post('/demo/sign', (c) => raController.demoSign(c))

// POST /ra/sign - Blind-sign a token payload (requires auth)
ra.post('/sign', authMiddleware, (c) => raController.sign(c))

export default ra
