import { Hono } from 'hono'
import { dashboardController } from '../controllers/dashboard.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const dashboard = new Hono()

// GET /dashboard - Get dashboard data (requires auth)
dashboard.get('/', authMiddleware, (c) => dashboardController.getDashboard(c))

export default dashboard

