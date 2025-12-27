import { Hono } from 'hono'
import { masterlistController } from '../controllers/masterlist.controller'

const masterlist = new Hono()

// GET /masterlist/verify?regNumber=xxx - Verify registration number (public)
masterlist.get('/verify', (c) => masterlistController.verify(c))

export default masterlist

