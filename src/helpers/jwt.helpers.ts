import type { JwtPayload } from '../types/jwt.types'
import { SignJWT, jwtVerify } from 'jose'

// Get JWT secret from environment and convert to Uint8Array (required by jose)
const getSecret = () => {
  const secret = Bun.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Generates an access token (short-lived, 15 minutes)
 * Used for API authentication
 */
export async function generateAccessToken(payload: JwtPayload): Promise<string> {
  const secret = getSecret()
  
  const jwt = await new SignJWT(payload as Record<string, any>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m') // Short-lived: 15 minutes
    .sign(secret)

  return jwt
}

/**
 * Generates a refresh token (long-lived, 7 days)
 * Used to get new access tokens
 */
export async function generateRefreshToken(payload: JwtPayload): Promise<string> {
  const secret = getSecret()
  
  const jwt = await new SignJWT(payload as Record<string, any>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Long-lived: 7 days
    .sign(secret)

  return jwt
}

/**
 * @deprecated Use generateAccessToken instead
 * Generates a JWT (JSON Web Token) signed with the application's secret.
 */
export async function generateJwtToken(payload: JwtPayload): Promise<string> {
  return generateAccessToken(payload)
}

/**
 * Verifies a JWT string using the application's secret.
 * If valid, returns the decoded payload. Otherwise, throws an error.
 * @param token - The JWT string to verify.
 * @returns {Promise<JwtPayload>} - The decoded payload if verification is successful.
 */
export async function verifyJwtToken(token: string): Promise<JwtPayload> {
  const secret = getSecret()
  
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as JwtPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
    
  }
}

/**
 * Decodes a JWT string without verifying its signature.
 * Useful for reading the token payload, but should not be used for authentication/authorization decisions.
 * @param token - The JWT string to decode.
 * @returns {object} - The decoded payload, header, and signature.
 */
export function decodeJwtToken(token: string) {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }
  
  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64url').toString('utf-8')
  )
  
  return payload
}