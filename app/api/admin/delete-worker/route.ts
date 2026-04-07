import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type DeleteWorkerBody = {
  id: string
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

    const body = (await req.json()) as DeleteWorkerBody

    if (!body.id) {
      return NextResponse.json(
        { success: false, message: 'id required' },
        { status: 400 }
      )
    }

    // 1. Avval Auth'dan o'chirish (agar users dan avval o'chilsa, auth orphan bo'lib qoladi)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(body.id)

    if (authDeleteError) {
      return NextResponse.json(
        { success: false, message: `Auth delete xato: ${authDeleteError.message}` },
        { status: 400 }
      )
    }

    // 2. Keyin users jadvalidan o'chirish
    const { error: userDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', body.id)

    if (userDeleteError) {
      return NextResponse.json(
        { success: false, message: `Auth'dan o'chdi, lekin users jadvalidan xato: ${userDeleteError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Worker deleted',
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
