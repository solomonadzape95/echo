import { Context } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'

/**
 * Cookie configuration for secure token storage
 * 
 * Note: For cross-origin requests (different domains), we MUST use 'none' with secure flag.
 * This is required when frontend and backend are on different domains (e.g., Vercel + Render).
 * 
 * In production, frontend (Vercel) and backend (Render) are on different domains,
 * so we always use 'none' with 'secure: true' in production.
 */
const getCookieOptions = () => {
  // Production: frontend (Vercel) and backend (Render) are on different sites,
  // so we need SameSite=None + Secure (+ Partitioned).
  // Development: everything runs on http://localhost, so Secure/Partitioned
  // cookies are rejected by browsers. Use SameSite=Lax and no Secure flag.
  const isProduction = process.env.NODE_ENV === 'production'
  const sameSite = isProduction ? ('none' as const) : ('lax' as const)
  const secure = isProduction
  const partitioned = isProduction

  return {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure, // Required for SameSite=None; off on local HTTP
    sameSite,
    partitioned, // CHIPS; only meaningful for cross-site production cookies
    path: '/', // Available on all paths
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  }
}

const COOKIE_OPTIONS = getCookieOptions();

const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

/**
 * Set access token in cookie (short-lived: 15 minutes)
 */
export function setAccessTokenCookie(c: Context, token: string) {
  const options = getCookieOptions();
  setCookie(c, ACCESS_TOKEN_COOKIE, token, {
    ...options,
    maxAge: 60 * 15, // 15 minutes
  })
}

/**
 * Set refresh token in cookie (long-lived: 7 days)
 */
export function setRefreshTokenCookie(c: Context, token: string) {
  const options = getCookieOptions();
  setCookie(c, REFRESH_TOKEN_COOKIE, token, {
    ...options,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

/**
 * Get access token from cookie
 */
export function getAccessTokenFromCookie(c: Context): string | undefined {
  return getCookie(c, ACCESS_TOKEN_COOKIE)
}

/**
 * Get refresh token from cookie
 */
export function getRefreshTokenFromCookie(c: Context): string | undefined {
  return getCookie(c, REFRESH_TOKEN_COOKIE)
}

/**
 * Clear both tokens (logout)
 */
export function clearTokenCookies(c: Context) {
  const options = getCookieOptions();
  setCookie(c, ACCESS_TOKEN_COOKIE, '', {
    ...options,
    maxAge: 0, // Expire immediately
  })
  setCookie(c, REFRESH_TOKEN_COOKIE, '', {
    ...options,
    maxAge: 0, // Expire immediately
  })
}
