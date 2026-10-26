import type { Context, Next } from 'hono'
import { getConnInfo } from 'hono/bun'

interface RateLimitOptions {
  /** Namespace so the lookup and register counters do not share a bucket. */
  keyPrefix: string
  windowMs: number
  max: number
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function clientAddress(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]!.trim()
  }
  const realIp = c.req.header('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  try {
    return getConnInfo(c).remote.address || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Small in-memory fixed-window limiter.
 *
 * This is deliberately dependency-free and good enough for a single API
 * instance. For multi-instance deployments, back it with Redis instead.
 */
export function rateLimit(options: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    const device = c.req.header('x-device-id') || 'no-device'
    const key = `${options.keyPrefix}:${clientAddress(c)}:${device}`
    const now = Date.now()

    if (buckets.size > 5_000) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey)
        }
      }
    }

    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs }
      buckets.set(key, bucket)
    }

    bucket.count += 1

    if (bucket.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
      c.header('Retry-After', String(retryAfter))
      return c.json({
        success: false,
        message: 'Too many attempts. Please wait a moment and try again.',
      }, 429)
    }

    await next()
  }
}
