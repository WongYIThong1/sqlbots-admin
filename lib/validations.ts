import { z } from 'zod'

/**
 * Validation schemas for API requests
 */

// Login validation
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email is too long')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password is too long'),
})

export type LoginInput = z.infer<typeof loginSchema>

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format')

// License creation validation
export const createLicenseSchema = z.object({
  planType: z.enum(['30d', '90d'], {
    message: 'Plan type must be "30d" or "90d"',
  }),
  count: z
    .number()
    .int('Count must be an integer')
    .min(1, 'Count must be at least 1')
    .max(100, 'Count cannot exceed 100'),
})

export type CreateLicenseInput = z.infer<typeof createLicenseSchema>

// Batch delete validation
export const batchDeleteSchema = z.object({
  ids: z
    .array(z.string().uuid('Invalid UUID format'))
    .min(1, 'At least one ID is required')
    .max(100, 'Cannot delete more than 100 items at once'),
})

export type BatchDeleteInput = z.infer<typeof batchDeleteSchema>

/**
 * Validate request body against schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details?: z.ZodError } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues || []
      const firstError = issues[0]
      return {
        success: false,
        error: firstError?.message || 'Validation failed',
        details: error,
      }
    }
    return { success: false, error: 'Invalid request data' }
  }
}

