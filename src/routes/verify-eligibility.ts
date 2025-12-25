import { Hono } from 'hono'
import { verifyEligibilityController } from '../controllers/verifyEligibility.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const verifyEligibility = new Hono()

// GET /verify-eligibility/public-key - Get public key for blinding (public)
verifyEligibility.get('/public-key', (c) => verifyEligibilityController.getPublicKey(c))

// GET /verify-eligibility?electionId=xxx - Verify eligibility and create token (requires auth)
verifyEligibility.get('/', authMiddleware, (c) => verifyEligibilityController.verifyAndCreateToken(c))

// POST /verify-eligibility/sign - Sign a blinded token (requires auth)
verifyEligibility.post('/sign', authMiddleware, (c) => verifyEligibilityController.signBlindedToken(c))

export default verifyEligibility