import { Hono } from 'hono'
import { authController } from '../../controllers/auth.controller'

const resetPassword = new Hono()

// POST /auth/reset-password
resetPassword.post('/', (c) => authController.resetPassword(c))

export default resetPassword

