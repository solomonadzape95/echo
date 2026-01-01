import { Context } from 'hono'
import { verifyEligibilityService } from '../services/verifyEligibility.service'
import { blindSignatureService } from '../services/blindSignature.service'
import { z } from 'zod'

const signBlindedTokenSchema = z.object({
  blindedToken: z.string().min(1, 'Blinded token is required'),
  election: z.string().uuid('Invalid election ID'),
})

export class VerifyEligibilityController {
  /**
   * Verify voter eligibility and create a signed voting token
   * This endpoint:
   * 1. Checks if voter has issuance for the election
   * 2. Creates a voting token
   * 3. Signs the blinded token (if provided)
   * 4. Returns the signed token
   */
  async verifyAndCreateToken(c: Context) {
    try {
      // Get voter ID from JWT token (set by authMiddleware)
      const user = c.get('user')
      if (!user || !user.id) {
        return c.json({
          success: false,
          message: 'Unauthorized: User not found in token',
        }, 401)
      }

      const electionId = c.req.query('electionId')
      if (!electionId) {
        return c.json({
          success: false,
          message: 'electionId query parameter is required',
        }, 400)
      }

      // Validate electionId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(electionId)) {
        return c.json({
          success: false,
          message: 'Invalid electionId format. Must be a valid UUID',
        }, 400)
      }

      // Verify eligibility and create token
      const result = await verifyEligibilityService.verifyAndCreateToken(
        user.id,
        electionId
      )

      return c.json({
        success: true,
        data: {
          token: result.token,
          publicKey: result.publicKey, // For client to use for blinding
          message: 'Eligibility verified. Token created. Blind your token and send it to /verify-eligibility/sign for signing.',
        },
      }, 200)
    } catch (error: any) {
      console.error('[VERIFY ELIGIBILITY] Error:', error)
      console.error('[VERIFY ELIGIBILITY] Error stack:', error.stack)
      return c.json({
        success: false,
        message: error.message || 'Failed to verify eligibility',
      }, 400)
    }
  }

  /**
   * Sign a blinded token
   * Client sends a blinded token, server signs it without seeing the original
   */
  async signBlindedToken(c: Context) {
    try {
      // Get voter ID from JWT token
      const user = c.get('user')
      if (!user || !user.id) {
        return c.json({
          success: false,
          message: 'Unauthorized: User not found in token',
        }, 401)
      }

      const body = await c.req.json()
      const validatedData = signBlindedTokenSchema.parse(body)

      // Verify that the user has a token for this election
      const token = await verifyEligibilityService.getTokenForVoter(
        user.id,
        validatedData.election
      )

      if (!token) {
        return c.json({
          success: false,
          message: 'No token found for this voter and election. Please verify eligibility first.',
        }, 404)
      }

      // Sign the blinded token
      const signature = blindSignatureService.signBlindedToken(
        validatedData.blindedToken
      )

      return c.json({
        success: true,
        data: {
          signature,
          tokenHash: token.tokenHash,
        },
        message: 'Blinded token signed successfully. Unblind the signature on the client side.',
      }, 200)
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        }, 400)
      }

      return c.json({
        success: false,
        message: error.message || 'Failed to sign blinded token',
      }, 400)
    }
  }

  /**
   * Get the public key for blinding (for clients)
   */
  async getPublicKey(c: Context) {
    try {
      const publicKey = blindSignatureService.getPublicKey()

      return c.json({
        success: true,
        data: {
          publicKey,
        },
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to get public key',
      }, 500)
    }
  }
}

export const verifyEligibilityController = new VerifyEligibilityController()

