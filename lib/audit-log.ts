import { supabase } from '@/lib/supabase'
import { AdminPayload } from './auth'

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'user_delete'
  | 'user_batch_delete'
  | 'license_create'
  | 'license_delete'
  | 'license_batch_delete'
  | 'token_refresh'
  | 'token_revoke'

export interface AuditLogEntry {
  admin_id: string | null
  action: AuditAction
  resource_type: string | null // e.g., 'user', 'license'
  resource_id: string | null
  ip_address: string | null
  user_agent: string | null
  details: Record<string, any> | null
  success: boolean
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  entry: AuditLogEntry
): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      admin_id: entry.admin_id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      details: entry.details,
      success: entry.success,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Error creating audit log:', error)
      // Don't throw - audit logging should not break the main flow
    }
  } catch (error) {
    console.error('Error creating audit log:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Log login attempt
 */
export async function logLoginAttempt(
  admin: AdminPayload | null,
  success: boolean,
  ipAddress: string | null,
  userAgent: string | null,
  email?: string
): Promise<void> {
  await createAuditLog({
    admin_id: admin?.id || null,
    action: success ? 'login_success' : 'login_failed',
    resource_type: null,
    resource_id: null,
    ip_address: ipAddress,
    user_agent: userAgent,
    details: email ? { email } : null,
    success,
  })
}

/**
 * Log user deletion
 */
export async function logUserDeletion(
  admin: AdminPayload,
  userId: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<void> {
  await createAuditLog({
    admin_id: admin.id,
    action: 'user_delete',
    resource_type: 'user',
    resource_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent,
    details: null,
    success: true,
  })
}

/**
 * Log license creation
 */
export async function logLicenseCreation(
  admin: AdminPayload,
  count: number,
  planType: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<void> {
  await createAuditLog({
    admin_id: admin.id,
    action: 'license_create',
    resource_type: 'license',
    resource_id: null,
    ip_address: ipAddress,
    user_agent: userAgent,
    details: { count, planType },
    success: true,
  })
}

/**
 * Log license deletion
 */
export async function logLicenseDeletion(
  admin: AdminPayload,
  licenseId: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<void> {
  await createAuditLog({
    admin_id: admin.id,
    action: 'license_delete',
    resource_type: 'license',
    resource_id: licenseId,
    ip_address: ipAddress,
    user_agent: userAgent,
    details: null,
    success: true,
  })
}

