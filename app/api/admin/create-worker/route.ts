import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type CreateWorkerBody = {
  fullName: string
  login: string
  password: string
  phone: string
  role: 'worker' | 'bekat_boshlighi'
  stationIds: string[]
  position: string
}

export async function POST(req: Request) {
  try {
    // --- DISPATCHER TEKSHIRUVI BOSHLANADI ---
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Avtorizatsiya talab etiladi' },
        { status: 401 }
      )
    }

    const { data: { user }, error: authCheckError } = await supabaseAdmin.auth.getUser(token)

    if (authCheckError || !user) {
      return NextResponse.json(
        { success: false, message: "Token noto'g'ri yoki muddati o'tgan" },
        { status: 401 }
      )
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'dispatcher') {
      return NextResponse.json(
        { success: false, message: 'Faqat dispatcher bajarishi mumkin' },
        { status: 403 }
      )
    }
    // --- DISPATCHER TEKSHIRUVI TUGADI ---

    const body = (await req.json()) as CreateWorkerBody

    if (!body.fullName || !body.login || !body.password) {
      return NextResponse.json(
        { success: false, message: 'fullName, login, password required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.stationIds) || body.stationIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Kamida bitta bekat tanlang' },
        { status: 400 }
      )
    }

    const email = `${body.login}@shch-buxoro.local`

    // ─── Avval tekshirish: email allaqachon bormi? ─────────────────
    const { data: existingUsers } = await supabaseAdmin
      .from('users')
      .select('id, login')
      .eq('login', body.login)

    if (existingUsers && existingUsers.length > 0) {
      // Eski foydalanuvchini o'chirish (Auth + Database)
      for (const existing of existingUsers) {
        // Auth dan o'chirish
        await supabaseAdmin.auth.admin.deleteUser(existing.id)
        // Database dan o'chirish (agar qolib ketgan bo'lsa)
        await supabaseAdmin.from('users').delete().eq('id', existing.id)
      }
    }

    // ─── Yangi foydalanuvchi yaratish ─────────────────────────────
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, message: authError?.message ?? 'Auth user create failed' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        login: body.login,
        full_name: body.fullName,
        role: body.role,
        position: body.position,
        station_ids: body.stationIds,
        phone: body.phone,
      })
      .select()
      .single()

    if (error || !data) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, message: error?.message ?? 'Insert failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Worker created',
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
