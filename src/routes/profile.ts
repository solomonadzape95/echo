import { Hono } from 'hono'
import { profileController } from '../controllers/profile.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const profile = new Hono()

// GET /profile - Get profile data (requires auth)
profile.get('/', authMiddleware, (c) => profileController.getProfile(c))

// PUT /profile/picture - Update profile picture (requires auth)
profile.put('/picture', authMiddleware, (c) => profileController.updateProfilePicture(c))

export default profile

