import { Hono } from 'hono'
import { webauthnController } from '../../controllers/webauthn.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

const webauthn = new Hono()

// Registration (requires an existing session)
webauthn.post('/register/options', authMiddleware, (c) => webauthnController.registrationOptions(c))
webauthn.post('/register/verify', authMiddleware, (c) => webauthnController.verifyRegistration(c))

// Login (public - the passkey is the credential)
webauthn.post('/login/options', (c) => webauthnController.authenticationOptions(c))
webauthn.post('/login/verify', (c) => webauthnController.verifyAuthentication(c))

// List a voter's passkeys
webauthn.get('/credentials', authMiddleware, (c) => webauthnController.listCredentials(c))

export default webauthn
