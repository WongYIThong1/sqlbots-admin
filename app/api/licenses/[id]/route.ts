import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: licenseId } = await params

    if (!licenseId) {
      return NextResponse.json(
        { error: 'License ID is required' },
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

