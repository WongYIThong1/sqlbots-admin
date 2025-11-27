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
    // Get all available plan types (30d and 90d)
    const allPlanTypes = ['30d', '90d']

    // Get count of unused licenses for each plan type
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('plan_type, user_id')
      .is('user_id', null)

    if (error) {
      console.error('Error fetching available plans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch available plans' },
        { status: 500 }
      )
    }

    // Count available licenses by plan type
    const availableCounts: Record<string, number> = {
      '30d': 0,
      '90d': 0,
    }

    licenses?.forEach((license) => {
      if (license.plan_type in availableCounts) {
        availableCounts[license.plan_type]++
      }
    })

    // Return plan types that have available licenses
    const availablePlans = allPlanTypes
      .filter((planType) => availableCounts[planType] > 0)
      .map((planType) => ({
        planType,
        availableCount: availableCounts[planType],
      }))

    return NextResponse.json({
      success: true,
      availablePlans,
      allPlanTypes: allPlanTypes.map((planType) => ({
        planType,
        availableCount: availableCounts[planType] || 0,
      })),
    })
  } catch (error) {
    console.error('Error in GET /api/plans/available:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

