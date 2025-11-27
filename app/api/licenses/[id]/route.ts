import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdmin } from '@/lib/auth'
import { uuidSchema, validateRequest } from '@/lib/validations'
import { csrfMiddleware } from '@/lib/csrf'
import { logLicenseDeletion } from '@/lib/audit-log'
import { getClientIP } from '@/lib/rate-limit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify authentication
  const authResult = await verifyAdmin(request)
  if ('error' in authResult) {
    return authResult.error
  }

  // CSRF protection
  const csrfCheck = csrfMiddleware(request)
  if (csrfCheck) {
    return csrfCheck
  }

  try {
    const { id: licenseId } = await params

    // Validate UUID
    const validation = validateRequest(uuidSchema, licenseId)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Check if license is in use
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('user_id')
      .eq('id', licenseId)
      .single()

    if (licenseError || !license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      )
    }

    if (license.user_id) {
      return NextResponse.json(
        { error: 'Cannot delete license that is in use. Please release it first.' },
        { status: 400 }
      )
    }

    // Delete the license
    const { error: deleteError } = await supabase
      .from('licenses')
      .delete()
      .eq('id', licenseId)

    if (deleteError) {
      console.error('Error deleting license:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete license' },
        { status: 500 }
      )
    }

    // Log license deletion
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent')
    await logLicenseDeletion(authResult.admin, licenseId, clientIP, userAgent)

    return NextResponse.json({
      success: true,
      message: 'License deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/licenses/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

