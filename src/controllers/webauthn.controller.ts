import { Context } from 'hono'
import { webauthnService } from '../services/webauthn.service'
import { authService } from '../services/auth.service'
import { setAccessTokenCookie, setRefreshTokenCookie } from '../helpers/cookie.helpers'
import { DeviceBindingError, type DeviceContext } from '../services/deviceBinding.service'

const isNativeClient = (c: Context) => c.req.header('x-client-platform') === 'native'

function deviceFromRequest(c: Context): { missing: boolean; device?: DeviceContext } {
  if (!isNativeClient(c)) {
    return { missing: false }
  }
  const id = c.req.header('x-device-id')?.trim()
  if (!id) {
    return { missing: true }
  }
  return {
    missing: false,
    device: {
      id,
      platform: c.req.header('x-device-platform')?.trim() || 'unknown',
    },
  }
}

/**
 * WebAuthn / passkey endpoints.
 *
 * Registration requires an existing session; login is public (the passkey *is*
 * the credential). Login issues the same cookies/tokens as password login.
 */
export class WebAuthnController {
  /** POST /auth/webauthn/register/options */
  async registrationOptions(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) return c.json({ success: false, message: 'Unauthorized' }, 401)

      const options = await webauthnService.registrationOptions(user.id)
      return c.json({ success: true, data: options }, 200)
    } catch (error: any) {
      return c.json({ success: false, message: error.message || 'Failed to start registration' }, 400)
    }
  }

  /** POST /auth/webauthn/register/verify */
  async verifyRegistration(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) return c.json({ success: false, message: 'Unauthorized' }, 401)

      const response = await c.req.json()
      const result = await webauthnService.verifyRegistration(user.id, response)
      return c.json({ success: true, data: result, message: 'Passkey registered' }, 200)
    } catch (error: any) {
      return c.json({ success: false, message: error.message || 'Registration failed' }, 400)
    }
  }

  /** POST /auth/webauthn/login/options  { regNumber } */
  async authenticationOptions(c: Context) {
    try {
      const body = await c.req.json()
      if (!body?.regNumber) {
        return c.json({ success: false, message: 'regNumber is required' }, 400)
      }
      const options = await webauthnService.authenticationOptions(body.regNumber)
      return c.json({ success: true, data: options }, 200)
    } catch (error: any) {
      return c.json({ success: false, message: error.message || 'Failed to start login' }, 400)
    }
  }

  /** POST /auth/webauthn/login/verify  (AuthenticationResponseJSON) */
  async verifyAuthentication(c: Context) {
    try {
      const response = await c.req.json()
      const voter = await webauthnService.verifyAuthentication(response)

      const device = deviceFromRequest(c)
      if (device.missing) {
        return c.json({
          success: false,
          message: 'This build of the app did not send a device identifier. Update the app to sign in.',
          code: 'DEVICE_ID_REQUIRED',
        }, 400)
      }

      const result = await authService.issueSession(voter, device.device)
      setAccessTokenCookie(c, result.accessToken)
      setRefreshTokenCookie(c, result.refreshToken)

      const data: any = { user: result.user, isAdmin: false }
      if (isNativeClient(c)) {
        data.accessToken = result.accessToken
        data.refreshToken = result.refreshToken
      }

      return c.json({ success: true, data, message: 'Login successful' }, 200)
    } catch (error: any) {
      if (error instanceof DeviceBindingError) {
        return c.json({
          success: false,
          message: error.message,
          code: 'DEVICE_BINDING',
        }, error.status)
      }
      return c.json({ success: false, message: error.message || 'Authentication failed' }, 401)
    }
  }

  /** GET /auth/webauthn/credentials */
  async listCredentials(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) return c.json({ success: false, message: 'Unauthorized' }, 401)

      const credentials = await webauthnService.listCredentials(user.id)
      return c.json({ success: true, data: credentials }, 200)
    } catch (error: any) {
      return c.json({ success: false, message: error.message || 'Failed to list passkeys' }, 400)
    }
  }
}

export const webauthnController = new WebAuthnController()
