import type { JwtPayload } from './jwt.types'

/**
 * Extends Hono's ContextVariableMap to include typed 'user' property.
 * This allows c.get('user') to return JwtPayload type throughout the app.
 */
declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

