import { Hono } from 'hono'
import { authController } from '../../controllers/auth.controller'

const forgotPassword = new Hono()

// POST /auth/forgot-password
forgotPassword.post('/', (c) => authController.forgotPassword(c))

export default forgotPassword