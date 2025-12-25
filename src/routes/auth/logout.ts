import { Hono } from 'hono'
import { authController } from '../../controllers/auth.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

const logout = new Hono()

// POST /auth/logout - Logout (requires auth to revoke token)
logout.post('/', authMiddleware, (c) => authController.logout(c))

export default logout

