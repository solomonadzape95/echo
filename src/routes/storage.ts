import { Hono } from 'hono'
import { adminMiddleware } from '../middleware/admin.middleware'
import { authMiddleware } from '../middleware/auth.middleware'
import { storageController } from '../controllers/storage.controller'

const storage = new Hono()

// POST /storage/upload - Upload image (requires user auth - for profile pictures)
storage.post('/upload', authMiddleware, (c) => storageController.upload(c))

// Admin routes
const adminStorage = new Hono()
adminStorage.use('*', adminMiddleware)

// POST /admin/storage/upload - Upload image (requires admin auth)
adminStorage.post('/upload', (c) => storageController.upload(c))

export { adminStorage }
export default storage

