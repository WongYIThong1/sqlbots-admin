/**
 * Environment variable validation
 * Validates all required environment variables at startup
 */

interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  JWT_SECRET: string
  CSRF_SECRET?: string
  NODE_ENV?: string
}

/**
 * Validate required environment variables
 */
export function validateEnv(): void {
  const required: (keyof EnvConfig)[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'JWT_SECRET',
  ]

  const missing: string[] = []

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file.'
    )
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET
  if (jwtSecret && jwtSecret.length < 32) {
    console.warn(
      'WARNING: JWT_SECRET is shorter than 32 characters. ' +
      'Consider using a longer, more secure secret in production.'
    )
  }

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must start with https://')
  }
}

/**
 * Get validated environment variables
 */
export function getEnv(): EnvConfig {
  validateEnv()

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    JWT_SECRET: process.env.JWT_SECRET!,
    CSRF_SECRET: process.env.CSRF_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development',
  }
}

// Validate on module load (server-side only)
if (typeof window === 'undefined') {
  try {
    validateEnv()
  } catch (error) {
    console.error('Environment validation failed:', error)
    // Don't throw in development to allow for easier setup
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
  }
}



