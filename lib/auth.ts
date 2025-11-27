import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getEnv } from './env'
import { supabase } from './supabase'

const env = getEnv()
const jwtSecret: string = env.JWT_SECRET
const REFRESH_TOKEN_SECRET = env.JWT_SECRET + '_refresh' // Use different secret for refresh tokens

export interface AdminPayload {
  id: string
  email: string
  role: string
  level: number
}

/**
 * Generate access token (short-lived, 15 minutes)
 */
export function generateAccessToken(admin: AdminPayload): string {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      level: admin.level,
      type: 'access',
    },
    jwtSecret,
    {
      expiresIn: '15m', // Access token expires in 15 minutes
    }
  )
}

/**
 * Generate refresh token (long-lived, 7 days)
 */
export function generateRefreshToken(admin: AdminPayload): string {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      level: admin.level,
      type: 'refresh',
    },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: '7d', // Refresh token expires in 7 days
    }
  )
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(admin: AdminPayload): {
  accessToken: string
  refreshToken: string
} {
  return {
    accessToken: generateAccessToken(admin),
    refreshToken: generateRefreshToken(admin),
  }
}

/**
 * Legacy function for backward compatibility
 */
export function generateToken(admin: AdminPayload): string {
  return generateAccessToken(admin)
}

/**
 * Hash token for storage in database
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Check if token is revoked
 */
async function isTokenRevoked(token: string): Promise<boolean> {
  const tokenHash = hashToken(token)
  
  const { data, error } = await supabase
    .from('revoked_tokens')
    .select('id')
    .eq('token_hash', tokenHash)
    .single()

  if (error || !data) {
    return false // Token not found in revoked list
  }

  return true // Token is revoked
}

/**
 * Verify access token and return admin payload
 */
export async function verifyAccessToken(token: string): Promise<AdminPayload | null> {
  try {
    const decoded = jwt.verify(token, jwtSecret) as any
    
    if (typeof decoded !== 'object' || decoded === null) {
      return null
    }

    // Check token type
    if (decoded.type !== 'access') {
      return null
    }

    // Check if token is revoked
    if (await isTokenRevoked(token)) {
      return null
    }

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      level: decoded.level,
    }
  } catch (error) {
    return null
  }
}

/**
 * Verify refresh token and return admin payload
 */
export async function verifyRefreshToken(token: string): Promise<AdminPayload | null> {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as any
    
    if (typeof decoded !== 'object' || decoded === null) {
      return null
    }

    // Check token type
    if (decoded.type !== 'refresh') {
      return null
    }

    // Check if token is revoked
    if (await isTokenRevoked(token)) {
      return null
    }

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      level: decoded.level,
    }
  } catch (error) {
    return null
  }
}

/**
 * Legacy function for backward compatibility
 */
export function verifyToken(token: string): AdminPayload | null {
  // This is a synchronous function, so we can't check revocation
  // For backward compatibility, we'll verify without revocation check
  try {
    const decoded = jwt.verify(token, jwtSecret)
    if (typeof decoded === 'object' && decoded !== null) {
      const payload = decoded as any
      return {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        level: payload.level,
      }
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

/**
 * Revoke a token (add to blacklist)
 */
export async function revokeToken(token: string): Promise<void> {
  try {
    const tokenHash = hashToken(token)
    
    // Decode token to get expiration
    let expiresAt: Date
    try {
      const decoded = jwt.decode(token) as any
      if (decoded && decoded.exp) {
        expiresAt = new Date(decoded.exp * 1000)
      } else {
        // Default to 7 days if we can't decode
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    } catch {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }

    await supabase.from('revoked_tokens').insert({
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Error revoking token:', error)
    // Don't throw - token revocation should not break the flow
  }
}

/**
 * Middleware to verify admin authentication
 * Returns admin payload if authenticated, or null if not
 */
export async function verifyAdmin(
  request: NextRequest
): Promise<{ admin: AdminPayload } | { error: NextResponse }> {
  const token = extractToken(request)

  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }

  // Try to verify as access token first
  const admin = await verifyAccessToken(token)
  
  // Fallback to legacy token verification for backward compatibility
  if (!admin) {
    const legacyAdmin = verifyToken(token)
    if (legacyAdmin) {
      return { admin: legacyAdmin }
    }
  }

  if (!admin) {
    return {
      error: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      ),
    }
  }

  return { admin }
}

