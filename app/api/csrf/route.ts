import { NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/csrf'

/**
 * GET /api/csrf - Get CSRF token (no authentication required)
 */
export async function GET() {
  const csrfToken = generateCSRFToken()

  return NextResponse.json({
    success: true,
    csrfToken,
  })
}



