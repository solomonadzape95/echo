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
  // const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, frontend and backend are on different domains (Vercel vs Render)
  // So we MUST use 'none' with 'secure: true' for cross-site cookies
  // In development, if same origin, we can use 'lax'
  const sameSite = 'none' as const ;
  
  // Secure flag MUST be true when using 'none' (required by browsers)
  // Also use secure in production for better security
  const secure = true; // Always use secure in production, and required for 'none'
  
  return {
    httpOnly: true,        // Prevents JavaScript access (XSS protection)
    secure,                // HTTPS required for 'none', always true
    sameSite,              // 'none' for cross-site (production), 'lax' for same-site (dev)
    path: '/',            // Available on all paths
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  };
};

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
