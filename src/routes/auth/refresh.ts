import { Hono } from 'hono'
import { authController } from '../../controllers/auth.controller'

const refresh = new Hono()

// POST /auth/refresh - Refresh access token
refresh.post('/', (c) => authController.refresh(c))

export default refresh

