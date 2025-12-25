import { Context } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'

/**
 * Cookie configuration for secure token storage
 */
const COOKIE_OPTIONS = {
  httpOnly: true,        // Prevents JavaScript access (XSS protection)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict' as const, // CSRF protection
  path: '/',            // Available on all paths
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
}

const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

/**
 * Set access token in cookie (short-lived: 15 minutes)
 */
export function setAccessTokenCookie(c: Context, token: string) {
  setCookie(c, ACCESS_TOKEN_COOKIE, token, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 15, // 15 minutes
  })
}

/**
 * Set refresh token in cookie (long-lived: 7 days)
 */
export function setRefreshTokenCookie(c: Context, token: string) {
  setCookie(c, REFRESH_TOKEN_COOKIE, token, {
    ...COOKIE_OPTIONS,
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
  setCookie(c, ACCESS_TOKEN_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0, // Expire immediately
  })
  setCookie(c, REFRESH_TOKEN_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0, // Expire immediately
  })
}
