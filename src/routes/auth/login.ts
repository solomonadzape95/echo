import { Hono } from 'hono'
import { authController } from '../../controllers/auth.controller'

const login = new Hono()

// POST /auth/login
login.post('/', (c) => authController.login(c))

export default login