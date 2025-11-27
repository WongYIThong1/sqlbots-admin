import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { generateTokens } from '@/lib/auth'
import { getClientIP, rateLimitMiddleware, checkRateLimit } from '@/lib/rate-limit'
import { loginSchema, validateRequest } from '@/lib/validations'
import { logLoginAttempt } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP address: 5 attempts per 15 minutes
    const clientIP = getClientIP(request)
    const ipRateLimit = rateLimitMiddleware(request, {
      limit: 5,
      window: 15 * 60 * 1000, // 15 minutes
      identifier: `login:ip:${clientIP}`,
    })

    if (ipRateLimit) {
      return ipRateLimit
    }

    const body = await request.json()

    // Validate input
    const validation = validateRequest(loginSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // Rate limiting by email: 3 failed attempts per 15 minutes
    const emailRateLimit = checkRateLimit({
      limit: 3,
      window: 15 * 60 * 1000, // 15 minutes
      identifier: `login:email:${email.toLowerCase()}`,
    })

    if (!emailRateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many failed login attempts for this email. Please try again later.',
          retryAfter: Math.ceil((emailRateLimit.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': emailRateLimit.limit.toString(),
            'X-RateLimit-Remaining': emailRateLimit.remaining.toString(),
            'X-RateLimit-Reset': emailRateLimit.reset.toString(),
            'Retry-After': Math.ceil((emailRateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const userAgent = request.headers.get('user-agent')

    // Query the admin from database
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !admin) {
      // Log failed login attempt
      await logLoginAttempt(null, false, clientIP, userAgent, email)
      // Don't reveal whether email exists or not (security best practice)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash)

    if (!isValidPassword) {
      // Log failed login attempt
      await logLoginAttempt(null, false, clientIP, userAgent, email)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = generateTokens({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      level: admin.level,
    })

    // Log successful login
    await logLoginAttempt(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        level: admin.level,
      },
      true,
      clientIP,
      userAgent,
      email
    )

    // Return admin data (without password hash) and tokens
    const { password_hash, ...adminData } = admin

    // Set refresh token as httpOnly cookie
    const response = NextResponse.json({
      success: true,
      admin: adminData,
      token: accessToken, // For backward compatibility
      accessToken,
      refreshToken, // Also return in body for client storage
    })

    // Set refresh token as httpOnly cookie (more secure)
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

