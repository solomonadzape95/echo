import { Context } from 'hono'
import { registrationAuthorityService } from '../services/registrationAuthority.service'
import { raSignSchema } from '../validators/ra.validator'

export class RAController {
  /**
   * GET /ra/public-key
   * Public. Returns the active RA public key (base64url SPKI) and the exact
   * RFC 9474 variant, so clients can blind and verify.
   */
  async getPublicKey(c: Context) {
    try {
      const data = await registrationAuthorityService.getPublicKey()
      return c.json({ success: true, data }, 200)
    } catch (error: any) {
      return c.json(
        { success: false, message: error.message || 'Failed to load RA public key' },
        500
      )
    }
  }

  /**
   * POST /ra/sign
   * Authenticated. Signs a blinded token payload. The RA never sees the token.
   */
  async sign(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const body = await c.req.json()
      const input = raSignSchema.parse(body)

      const data = await registrationAuthorityService.signBlinded(
        user.id,
        input.electionId,
        input.blindedMsg
      )

      return c.json(
        {
          success: true,
          data,
          message: 'Blinded token signed. Unblind locally before submitting.',
        },
        200
      )
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return c.json(
          {
            success: false,
            message: 'Validation error',
            errors: error.errors.map((e: any) => ({
              path: e.path ?? [],
              message: e.message ?? 'Validation failed',
            })),
          },
          400
        )
      }

      const status = error.message === 'You have already voted in this election' ? 409 : 400
      return c.json({ success: false, message: error.message || 'Failed to sign blinded token' }, status)
    }
  }
}

export const raController = new RAController()
