import { Hono } from 'hono'
import { adminController } from '../../controllers/admin.controller'

const auth = new Hono()

// Admin login route - NO middleware (public endpoint for login)
// POST /admin/auth/login
auth.post('/login', (c) => adminController.login(c))

export default auth

