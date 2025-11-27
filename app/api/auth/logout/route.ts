import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, revokeToken, extractToken } from '@/lib/auth'

/**
 * POST /api/auth/logout - Revoke tokens and logout
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAdmin(request)
    if ('error' in authResult) {
      return authResult.error
    }

    // Extract and revoke access token
    const accessToken = extractToken(request)
    if (accessToken) {
      await revokeToken(accessToken)
    }

    // Extract refresh token from body if provided
    try {
      const body = await request.json()
      if (body.refreshToken) {
        await revokeToken(body.refreshToken)
      }
    } catch {
      // Body might not be JSON or might not have refreshToken
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Error logging out:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

