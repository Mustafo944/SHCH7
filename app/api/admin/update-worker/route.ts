import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type UpdateWorkerBody = {
  id: string
  fullName?: string
  login?: string
  password?: string
  phone?: string
  role?: 'worker' | 'bekat_boshlighi'
  stationIds?: string[]
  position?: string
}

export async function POST(req: Request) {
  try {
    // --- DISPATCHER TEKSHIRUVI BOSHLANADI ---
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, message: 'No auth token' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    const login = user.email?.replace('@shch-buxoro.local', '') ?? ''
    const { data: dispatcher } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('login', login)
      .single()

    if (!dispatcher || dispatcher.role !== 'dispatcher') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    // --- DISPATCHER TEKSHIRUVI TUGADI ---

    const body = (await req.json()) as UpdateWorkerBody

    if (!body.id) {
      return NextResponse.json(
        { success: false, message: 'id required' },
        { status: 400 }
      )
    }

    const updatePayload: Record<string, unknown> = {}

    if (body.fullName !== undefined) updatePayload.full_name = body.fullName
    if (body.login !== undefined) updatePayload.login = body.login
    if (body.role !== undefined) updatePayload.role = body.role
    if (body.position !== undefined) updatePayload.position = body.position
    if (body.stationIds !== undefined) updatePayload.station_ids = body.stationIds
    if (body.phone !== undefined) updatePayload.phone = body.phone

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', body.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: error?.message ?? 'Update failed' },
        { status: 400 }
      )
    }

    if (body.login !== undefined || body.password) {
      const updateAuthPayload: Record<string, unknown> = {}

      if (body.login !== undefined) {
        updateAuthPayload.email = `${body.login}@shch-buxoro.local`
      }

      if (body.password) {
        updateAuthPayload.password = body.password
      }

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        body.id,
        updateAuthPayload
      )

      if (authError) {
        return NextResponse.json(
          { success: false, message: authError.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Worker updated',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    )
  }
}
