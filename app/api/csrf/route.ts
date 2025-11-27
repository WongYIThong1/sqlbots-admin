import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth'
import { generateCSRFToken } from '@/lib/csrf'

/**
 * GET /api/csrf - Get CSRF token (requires authentication)
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdmin(request)
  if ('error' in authResult) {
    return authResult.error
  }

  // Generate and return CSRF token
  const csrfToken = generateCSRFToken()

  return NextResponse.json({
    success: true,
    csrfToken,
  })
}

