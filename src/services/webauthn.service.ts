import { and, eq, gt } from 'drizzle-orm'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { db } from '../db/db'
import { voters } from '../models/voter.schema'
import { webauthnChallenges, webauthnCredentials } from '../models/webauthn.schema'

/**
 * WebAuthn / passkey service.
 *
 * This is a *login* factor only. It is completely independent of the RFC 9474
 * voting pipeline: a passkey authenticates the account, never the ballot. Only
 * the credential public key is stored — no biometric template ever leaves the
 * device (NIST SP 800-63B).
 */

const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'BlindVote'
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost'
const ORIGINS = (process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const CHALLENGE_TTL_MS = 5 * 60 * 1000

function parseTransports(value: string | null): string[] | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export class WebAuthnService {
  /** Begin passkey registration for an authenticated voter. */
  async registrationOptions(voterId: string) {
    const [voter] = await db.select().from(voters).where(eq(voters.id, voterId)).limit(1)
    if (!voter) throw new Error('Voter not found')

    const existing = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.voterId, voterId))

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: voter.regNumber,
      userDisplayName: voter.username,
      userID: new TextEncoder().encode(voter.id),
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: parseTransports(c.transports) as any,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    await this.storeChallenge(voterId, options.challenge, 'registration')
    return options
  }

  /** Finish passkey registration and persist the credential. */
  async verifyRegistration(voterId: string, response: RegistrationResponseJSON) {
    const challenge = await this.consumeChallenge(voterId, 'registration')
    if (!challenge) throw new Error('Registration challenge not found or expired')

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGINS,
      expectedRPID: RP_ID,
    })

    if (!verification.verified) throw new Error('Registration verification failed')

    const info = verification.registrationInfo
    await db.insert(webauthnCredentials).values({
      voterId,
      credentialId: info.credential.id,
      publicKey: Buffer.from(info.credential.publicKey).toString('base64url'),
      counter: info.credential.counter,
      transports: info.credential.transports ? JSON.stringify(info.credential.transports) : null,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
    })

    return { verified: true }
  }

  /** Begin passkey login for a registration number. */
  async authenticationOptions(regNumber: string) {
    const [voter] = await db.select().from(voters).where(eq(voters.regNumber, regNumber)).limit(1)
    if (!voter) throw new Error('No account found for that registration number')

    const creds = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.voterId, voter.id))

    if (creds.length === 0) throw new Error('No passkey is registered for this account')

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: creds.map((c) => ({
        id: c.credentialId,
        transports: parseTransports(c.transports) as any,
      })),
      userVerification: 'preferred',
    })

    await this.storeChallenge(voter.id, options.challenge, 'authentication')
    return options
  }

  /** Finish passkey login; returns the authenticated voter. */
  async verifyAuthentication(response: AuthenticationResponseJSON) {
    const [cred] = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.credentialId, response.id))
      .limit(1)

    if (!cred) throw new Error('Unknown credential')

    const challenge = await this.consumeChallenge(cred.voterId, 'authentication')
    if (!challenge) throw new Error('Authentication challenge not found or expired')

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGINS,
      expectedRPID: RP_ID,
      credential: {
        id: cred.credentialId,
        publicKey: new Uint8Array(Buffer.from(cred.publicKey, 'base64url')),
        counter: cred.counter,
        transports: parseTransports(cred.transports) as any,
      },
    })

    if (!verification.verified) throw new Error('Authentication failed')

    await db
      .update(webauthnCredentials)
      .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() })
      .where(eq(webauthnCredentials.id, cred.id))

    const [voter] = await db.select().from(voters).where(eq(voters.id, cred.voterId)).limit(1)
    if (!voter) throw new Error('Voter not found')

    return voter
  }

  /** List a voter's registered passkeys (for the profile screen). */
  async listCredentials(voterId: string) {
    const creds = await db
      .select({
        id: webauthnCredentials.id,
        deviceType: webauthnCredentials.deviceType,
        backedUp: webauthnCredentials.backedUp,
        createdAt: webauthnCredentials.createdAt,
        lastUsedAt: webauthnCredentials.lastUsedAt,
      })
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.voterId, voterId))

    return creds
  }

  private async storeChallenge(voterId: string, challenge: string, type: string) {
    await db
      .delete(webauthnChallenges)
      .where(and(eq(webauthnChallenges.voterId, voterId), eq(webauthnChallenges.type, type)))

    await db.insert(webauthnChallenges).values({
      voterId,
      challenge,
      type,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    })
  }

  private async consumeChallenge(voterId: string, type: string) {
    const [row] = await db
      .select()
      .from(webauthnChallenges)
      .where(
        and(
          eq(webauthnChallenges.voterId, voterId),
          eq(webauthnChallenges.type, type),
          gt(webauthnChallenges.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!row) return null
    await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, row.id))
    return row.challenge
  }
}

export const webauthnService = new WebAuthnService()
