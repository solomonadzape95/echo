import { Hono } from 'hono'
import { authController } from '../../controllers/auth.controller'
import { rateLimit } from '../../middleware/rateLimit.middleware'

const register = new Hono()

// POST /auth/register
register.post(
  '/',
  rateLimit({ keyPrefix: 'auth-register', windowMs: 60 * 60 * 1000, max: 10 }),
  (c) => authController.register(c)
)

export default register