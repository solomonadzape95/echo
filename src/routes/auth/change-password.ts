import { Hono } from 'hono'
import { authController } from '../../controllers/auth.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

const changePassword = new Hono()

// POST /auth/change-password (requires authentication)
changePassword.post('/', authMiddleware, (c) => authController.changePassword(c))

export default changePassword

