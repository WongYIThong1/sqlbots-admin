import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdmin(request)
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Get license information for users who have licenses
    const licenseIds = users?.filter(u => u.license_id).map(u => u.license_id) || []
    let licensesMap: Record<string, any> = {}
    
    if (licenseIds.length > 0) {
      const { data: licenses, error: licensesError } = await supabase
        .from('licenses')
        .select('id, license_key, plan_type, expires_at')
        .in('id', licenseIds)

      if (!licensesError && licenses) {
        licenses.forEach((license: any) => {
          licensesMap[license.id] = license
        })
      }
    }

    // Transform the data to include plan information
    const usersWithPlan = users?.map((user: any) => {
      const license = user.license_id ? licensesMap[user.license_id] : null
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        plan: license?.plan_type || 'None',
        license: license?.license_key || license?.id || null, // Use license_key if available, fallback to id
        licenseExpiresAt: license?.expires_at || null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }
    }) || []

    return NextResponse.json({
      success: true,
      users: usersWithPlan,
    })
  } catch (error) {
    console.error('Error in GET /api/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

