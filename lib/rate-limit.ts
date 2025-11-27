import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store (for development)
// In production, consider using Redis or Upstash
const store: RateLimitStore = {}

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key]
      }
    })
  }, 5 * 60 * 1000)
}

export interface RateLimitOptions {
  limit: number // Maximum number of requests
  window: number // Time window in milliseconds
  identifier: string // Unique identifier (e.g., IP address, email)
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  options: RateLimitOptions
): RateLimitResult {
  const { limit, window, identifier } = options
  const key = identifier
  const now = Date.now()

  // Get or create entry
  let entry = store[key]

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    entry = {
      count: 0,
      resetTime: now + window,
    }
    store[key] = entry
  }

  // Increment count
  entry.count++

  const remaining = Math.max(0, limit - entry.count)
  const success = entry.count <= limit

  return {
    success,
    limit,
    remaining,
    reset: entry.resetTime,
  }
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Fallback to a default identifier
  return 'unknown'
}

/**
 * Rate limit middleware
 */
export function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const result = checkRateLimit(options)

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  return null
}

