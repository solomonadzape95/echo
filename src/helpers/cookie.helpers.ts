import { Context } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'

/**
 * Cookie configuration for secure token storage
 * 
 * Note: For cross-origin requests (different domains), we use 'none' with secure flag.
 * For same-origin or same-site requests, 'lax' provides better CSRF protection.
 */
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isCrossOrigin = process.env.FRONTEND_URL && 
    process.env.FRONTEND_URL !== process.env.API_URL;
  
  // For cross-origin scenarios, use 'none' with secure flag (requires HTTPS)
  // For same-origin, use 'lax' for better CSRF protection
  const sameSite = (isCrossOrigin && isProduction) ? 'none' as const : 'lax' as const;
  
  return {
    httpOnly: true,        // Prevents JavaScript access (XSS protection)
    secure: isProduction || sameSite === 'none', // HTTPS required for 'none', recommended for production
    sameSite,              // CSRF protection - 'lax' for same-site, 'none' for cross-origin
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
