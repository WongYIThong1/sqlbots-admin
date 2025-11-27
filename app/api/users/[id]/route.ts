import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdmin } from '@/lib/auth'
import { uuidSchema, validateRequest } from '@/lib/validations'
import { csrfMiddleware } from '@/lib/csrf'
import { logUserDeletion } from '@/lib/audit-log'
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

  // TODO: Re-enable CSRF after setting CSRF_SECRET env var
  // const csrfCheck = csrfMiddleware(request)
  // if (csrfCheck) return csrfCheck

  try {
    const { id: userId } = await params

    // Validate UUID
    const validation = validateRequest(uuidSchema, userId)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // First, get the user's license_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('license_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete the user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    // If user had a license, release it (set user_id to null)
    if (user.license_id) {
      const { error: licenseError } = await supabase
        .from('licenses')
        .update({ user_id: null })
        .eq('id', user.license_id)

      if (licenseError) {
        console.error('Error releasing license:', licenseError)
        // Don't fail the request if license release fails
      }
    }

    // Log user deletion
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent')
    await logUserDeletion(authResult.admin, userId, clientIP, userAgent)

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

