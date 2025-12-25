import { Hono } from 'hono'
import { authController } from '../../controllers/auth.controller'

const register = new Hono()

// POST /auth/register
register.post('/', (c) => authController.register(c))

export default register