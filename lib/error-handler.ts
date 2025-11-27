import { NextResponse } from 'next/server'

export interface AppError {
  message: string
  statusCode: number
  code?: string
  details?: any
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: AppError | Error | unknown,
  defaultMessage: string = 'Internal server error',
  defaultStatusCode: number = 500
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production'

  // Log the full error for server-side debugging
  if (error instanceof Error) {
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
  } else {
    console.error('Error:', error)
  }

  // Determine error details
  let message: string
  let statusCode: number
  let code: string | undefined

  if (error && typeof error === 'object' && 'statusCode' in error) {
    const appError = error as AppError
    message = appError.message || defaultMessage
    statusCode = appError.statusCode || defaultStatusCode
    code = appError.code
  } else if (error instanceof Error) {
    message = isProduction ? defaultMessage : error.message
    statusCode = defaultStatusCode
  } else {
    message = defaultMessage
    statusCode = defaultStatusCode
  }

  // In production, don't expose internal error details
  const responseBody: any = {
    error: message,
  }

  // Only include code in development
  if (!isProduction && code) {
    responseBody.code = code
  }

  return NextResponse.json(responseBody, { status: statusCode })
}

/**
 * Handle validation errors
 */
export function handleValidationError(error: unknown): NextResponse {
  return createErrorResponse(
    {
      message: 'Validation error',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: error,
    },
    'Invalid request data',
    400
  )
}

/**
 * Handle authentication errors
 */
export function handleAuthError(message: string = 'Authentication required'): NextResponse {
  return createErrorResponse(
    {
      message,
      statusCode: 401,
      code: 'AUTH_ERROR',
    },
    message,
    401
  )
}

/**
 * Handle authorization errors
 */
export function handleAuthorizationError(message: string = 'Insufficient permissions'): NextResponse {
  return createErrorResponse(
    {
      message,
      statusCode: 403,
      code: 'AUTHORIZATION_ERROR',
    },
    message,
    403
  )
}

/**
 * Handle not found errors
 */
export function handleNotFoundError(resource: string = 'Resource'): NextResponse {
  return createErrorResponse(
    {
      message: `${resource} not found`,
      statusCode: 404,
      code: 'NOT_FOUND',
    },
    `${resource} not found`,
    404
  )
}

/**
 * Handle rate limit errors
 */
export function handleRateLimitError(retryAfter?: number): NextResponse {
  const headers: Record<string, string> = {}
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString()
  }

  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      retryAfter,
    },
    {
      status: 429,
      headers,
    }
  )
}

