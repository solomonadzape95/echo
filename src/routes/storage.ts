import { Hono } from 'hono'
import { adminMiddleware } from '../middleware/admin.middleware'
import { storageController } from '../controllers/storage.controller'

const storage = new Hono()

// All storage routes require admin authentication
storage.use('*', adminMiddleware)

// POST /admin/storage/upload - Upload image to Supabase
storage.post('/upload', (c) => storageController.upload(c))

export default storage

