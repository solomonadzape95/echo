import { Hono } from 'hono'
import { masterlistController } from '../controllers/masterlist.controller'
import { rateLimit } from '../middleware/rateLimit.middleware'

const masterlist = new Hono()

// GET /masterlist/verify?regNumber=xxx - Verify registration number (public)
masterlist.get(
  '/verify',
  rateLimit({ keyPrefix: 'masterlist-verify', windowMs: 10 * 60 * 1000, max: 20 }),
  (c) => masterlistController.verify(c)
)

export default masterlist

