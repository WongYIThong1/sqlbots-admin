import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required. Please set it in your .env.local file.'
  )
}

// Type assertion: we know JWT_SECRET is defined after the check above
const jwtSecret: string = JWT_SECRET

export interface AdminPayload {
  id: string
  email: string
  role: string
  level: number
}

/**
 * Generate JWT token for admin
 */
export function generateToken(admin: AdminPayload): string {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      level: admin.level,
    },
    jwtSecret,
    {
      expiresIn: '24h', // Token expires in 24 hours
    }
  )
}

/**
 * Verify JWT token and return admin payload
 */
export function verifyToken(token: string): AdminPayload | null {
  try {
    const decoded = jwt.verify(token, jwtSecret)
    if (typeof decoded === 'object' && decoded !== null) {
      return decoded as AdminPayload
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

  const admin = verifyToken(token)

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

