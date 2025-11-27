import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdmin } from '@/lib/auth'
import { createLicenseSchema, batchDeleteSchema, validateRequest } from '@/lib/validations'
import { csrfMiddleware } from '@/lib/csrf'
import { logLicenseCreation, logLicenseDeletion } from '@/lib/audit-log'
import { getClientIP } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdmin(request)
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    // Get all licenses
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching licenses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch licenses' },
        { status: 500 }
      )
    }

    // Get user information for licenses that are in use
    const userIds = licenses?.filter(l => l.user_id).map(l => l.user_id) || []
    let usersMap: Record<string, any> = {}
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', userIds)

      if (!usersError && users) {
        users.forEach((user: any) => {
          usersMap[user.id] = user
        })
      }
    }

    // Transform the data
    const licensesWithUser = licenses?.map((license: any) => {
      const user = license.user_id ? usersMap[license.user_id] : null
      return {
        id: license.id,
        licenseKey: license.license_key || license.id, // Fallback to id if license_key is null
        planType: license.plan_type,
        userId: license.user_id,
        userName: user?.username || null,
        userEmail: user?.email || null,
        createdAt: license.created_at,
        expiresAt: license.expires_at,
        isUsed: license.user_id !== null,
      }
    }) || []

    return NextResponse.json({
      success: true,
      licenses: licensesWithUser,
    })
  } catch (error) {
    console.error('Error in GET /api/licenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateLicenseKey(planType: '30d' | '90d'): string {
  // Generate random alphanumeric string for xxxx-xxxx part
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluding confusing characters
  const generateSegment = (length: number) => {
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }
  
  const prefix = planType === '30d' ? 'SQLBots30' : 'SQLBots90'
  const segment1 = generateSegment(4)
  const segment2 = generateSegment(4)
  
  return `${prefix}-${segment1}-${segment2}`
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdmin(request)
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const body = await request.json()

    // TODO: Re-enable CSRF after setting CSRF_SECRET env var
    // const csrfCheck = csrfMiddleware(request, body)
    // if (csrfCheck) return csrfCheck

    // Validate input
    const validation = validateRequest(createLicenseSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { planType, count: licenseCount } = validation.data

    // Calculate expires_at based on plan_type
    const expiresAt = new Date()
    if (planType === '30d') {
      expiresAt.setDate(expiresAt.getDate() + 30)
    } else if (planType === '90d') {
      expiresAt.setDate(expiresAt.getDate() + 90)
    }

    const licensesToCreate = []
    const createdLicenses = []

    // Generate multiple licenses
    for (let i = 0; i < licenseCount; i++) {
      // Generate unique license key
      let licenseKey: string
      let attempts = 0
      const maxAttempts = 10

      do {
        licenseKey = generateLicenseKey(planType as '30d' | '90d')
        
        // Check if key already exists
        const { data: existing } = await supabase
          .from('licenses')
          .select('id')
          .eq('license_key', licenseKey)
          .single()

        if (!existing) {
          break // Key is unique
        }

        attempts++
        if (attempts >= maxAttempts) {
          return NextResponse.json(
            { error: `Failed to generate unique license key (attempt ${i + 1})` },
            { status: 500 }
          )
        }
      } while (true)

      licensesToCreate.push({
        plan_type: planType,
        license_key: licenseKey,
        user_id: null,
        expires_at: expiresAt.toISOString(),
      })
    }

    // Batch insert licenses
    const { data: licenses, error } = await supabase
      .from('licenses')
      .insert(licensesToCreate)
      .select()

    if (error) {
      console.error('Error creating licenses:', error)
      return NextResponse.json(
        { error: 'Failed to create licenses' },
        { status: 500 }
      )
    }

    // Log license creation
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent')
    await logLicenseCreation(
      authResult.admin,
      licenseCount,
      planType,
      clientIP,
      userAgent
    )

    return NextResponse.json({
      success: true,
      count: licenses?.length || 0,
      licenses: licenses?.map((license: any) => ({
        id: license.id,
        licenseKey: license.license_key,
        planType: license.plan_type,
        expiresAt: license.expires_at,
        createdAt: license.created_at,
      })) || [],
    })
  } catch (error) {
    console.error('Error in POST /api/licenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdmin(request)
  if ('error' in authResult) {
    return authResult.error
  }

  try {
    const body = await request.json()

    // TODO: Re-enable CSRF after setting CSRF_SECRET env var
    // const csrfCheck = csrfMiddleware(request, body)
    // if (csrfCheck) return csrfCheck

    // Validate input
    const validation = validateRequest(batchDeleteSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { ids } = validation.data

    // Check if any of the licenses are in use
    const { data: licenses, error: fetchError } = await supabase
      .from('licenses')
      .select('id, user_id')
      .in('id', ids)

    if (fetchError) {
      console.error('Error fetching licenses:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch licenses' },
        { status: 500 }
      )
    }

    if (!licenses || licenses.length === 0) {
      return NextResponse.json(
        { error: 'No licenses found' },
        { status: 404 }
      )
    }

    // Check for licenses in use
    const licensesInUse = licenses.filter((l: any) => l.user_id !== null)
    if (licensesInUse.length > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete ${licensesInUse.length} license(s) that are in use. Please release them first.`,
          inUseCount: licensesInUse.length
        },
        { status: 400 }
      )
    }

    // Get only available licenses (not in use)
    const availableLicenseIds = licenses
      .filter((l: any) => l.user_id === null)
      .map((l: any) => l.id)

    if (availableLicenseIds.length === 0) {
      return NextResponse.json(
        { error: 'No available licenses to delete' },
        { status: 400 }
      )
    }

    // Delete the licenses
    const { error: deleteError } = await supabase
      .from('licenses')
      .delete()
      .in('id', availableLicenseIds)

    if (deleteError) {
      console.error('Error deleting licenses:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete licenses' },
        { status: 500 }
      )
    }

    // Log license deletions
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent')
    for (const licenseId of availableLicenseIds) {
      await logLicenseDeletion(authResult.admin, licenseId, clientIP, userAgent)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${availableLicenseIds.length} license(s)`,
      deletedCount: availableLicenseIds.length,
    })
  } catch (error) {
    console.error('Error in DELETE /api/licenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

