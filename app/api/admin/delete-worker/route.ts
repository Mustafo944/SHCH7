import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type DeleteWorkerBody = {
  id: string
  /** true bo'lsa — arxivdan qayta tiklash (deleted_at = null) */
  restore?: boolean
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

    if (body.restore) {
      // ── QAYTA TIKLASH: deleted_at ni null qilish ──
      const { error: restoreError } = await supabaseAdmin
        .from('users')
        .update({ deleted_at: null })
        .eq('id', body.id)

      if (restoreError) {
        return NextResponse.json(
          { success: false, message: `Tiklashda xato: ${restoreError.message}` },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Worker restored',
      })
    }

    // ── SOFT DELETE: deleted_at = now() ──
    // Auth yozuvini O'CHIRMAYMIZ — faqat `users` jadvalida arxivlaymiz.
    // getUserProfileById da `deleted_at IS NULL` filtri bor, shuning uchun
    // arxivlangan ishchi login ham qila olmaydi.
    const { error: softDeleteError } = await supabaseAdmin
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', body.id)

    if (softDeleteError) {
      return NextResponse.json(
        { success: false, message: `Arxivlashda xato: ${softDeleteError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Worker archived (soft delete)',
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
