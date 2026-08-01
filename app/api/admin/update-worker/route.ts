import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type UpdateWorkerBody = {
  id: string
  fullName?: string
  login?: string
  password?: string
  phone?: string
  role?: 'worker' | 'bekat_boshlighi' | 'elektromexanik' | 'elektromontyor' | 'bekat_navbatchisi' | 'yul_ustasi' | 'ech_xodimi' | 'mehnat_muhofazasi'
  stationIds?: string[]
  position?: string
  photoUrl?: string
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

    const { data: dispatcher } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
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

    // ─── 1. AVVAL Auth (email/parol) yangilanadi ───────────────────
    // Tartib MUHIM: agar avval `users` jadvali yangilanib, keyin Auth
    // qismi xato bersa (masalan yangi login/email allaqachon band),
    // interfeys yangi login'ni ko'rsatib qolar edi-yu, xodim esa hali
    // ESKI login bilan kirishga majbur bo'lardi (chunki haqiqiy kirish
    // Auth'dagi email'ga bog'liq). Shu sababli xato ehtimoli ko'proq
    // bo'lgan Auth qismini OLDIN bajaramiz — muvaffaqiyatsiz bo'lsa,
    // `users` jadvaliga umuman tegilmagan bo'ladi.
    let previousEmail: string | null = null

    if (body.login !== undefined || body.password) {
      if (body.login !== undefined) {
        // Xato bo'lib qolsa email'ni eskisiga qaytarish uchun saqlab qo'yamiz
        const { data: currentAuthUser } = await supabaseAdmin.auth.admin.getUserById(body.id)
        previousEmail = currentAuthUser?.user?.email ?? null
      }

      const updateAuthPayload: Record<string, unknown> = {}

      if (body.login !== undefined) {
        updateAuthPayload.email = `${body.login}@shch-buxoro.local`
      }

      if (body.password) {
        updateAuthPayload.password = body.password
      }

      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        body.id,
        updateAuthPayload
      )

      if (authUpdateError) {
        return NextResponse.json(
          { success: false, message: authUpdateError.message },
          { status: 400 }
        )
      }
    }

    // ─── 2. Keyin `users` jadvali yangilanadi ──────────────────────
    const updatePayload: Record<string, unknown> = {}

    if (body.fullName !== undefined) updatePayload.full_name = body.fullName
    if (body.login !== undefined) updatePayload.login = body.login
    if (body.role !== undefined) updatePayload.role = body.role
    if (body.position !== undefined) updatePayload.position = body.position
    if (body.stationIds !== undefined) updatePayload.station_ids = body.stationIds
    if (body.phone !== undefined) updatePayload.phone = body.phone
    if (body.photoUrl !== undefined) updatePayload.photo_url = body.photoUrl

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', body.id)
      .select()
      .single()

    if (error || !data) {
      // MUHIM: Auth email allaqachon o'zgargan, lekin `users` jadvali
      // yangilanmadi — ikkalasi mos kelmay qolmasligi uchun Auth email'ni
      // ESKI holatga qaytaramiz (rollback).
      if (previousEmail) {
        await supabaseAdmin.auth.admin.updateUserById(body.id, { email: previousEmail })
      }
      return NextResponse.json(
        { success: false, message: error?.message ?? 'Update failed' },
        { status: 400 }
      )
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
