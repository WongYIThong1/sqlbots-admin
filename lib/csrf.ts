import csrf from 'csrf'
import { NextRequest, NextResponse } from 'next/server'
import { getEnv } from './env'

const tokens = new csrf()

// Get CSRF secret from environment
const env = getEnv()
const CSRF_SECRET = env.CSRF_SECRET || 'csrf-secret-change-in-production'

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return tokens.create(CSRF_SECRET)
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string): boolean {
  if (!token) {
    return false
  }
  return tokens.verify(CSRF_SECRET, token)
}

/**
 * Extract CSRF token from request
 */
export function extractCSRFToken(request: NextRequest): string | null {
  // Check header first (preferred for API requests)
  const headerToken = request.headers.get('x-csrf-token')
  if (headerToken) {
    return headerToken
  }

  // Check body for form submissions
  // Note: This requires the body to be parsed, which is done in the route handler
  return null
}

/**
 * CSRF middleware for API routes
 */
export function csrfMiddleware(
  request: NextRequest,
  body?: { csrfToken?: string }
): NextResponse | null {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  const method = request.method
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null
  }

  // Extract token from header or body
  const token = extractCSRFToken(request) || body?.csrfToken

  if (!token) {
    return NextResponse.json(
      { error: 'CSRF token is required' },
      { status: 403 }
    )
  }

  if (!verifyCSRFToken(token)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  return null
}

