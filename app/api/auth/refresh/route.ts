import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, generateTokens } from '@/lib/auth'
import { extractToken } from '@/lib/auth'

/**
 * POST /api/auth/refresh - Refresh access token using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = extractToken(request)

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 401 }
      )
    }

    // Verify refresh token
    const admin = await verifyRefreshToken(refreshToken)

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(admin)

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    })
  } catch (error) {
    console.error('Error refreshing token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

