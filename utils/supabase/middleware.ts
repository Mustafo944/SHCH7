import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLE_HOME } from '@/lib/auth/roles'
import { getRoleFromToken } from '@/lib/auth/jwt'

// Rol → ruxsat etilgan route'lar
const PROTECTED_ROUTES: Record<string, string[]> = {
  '/dispatcher': ['dispatcher'],
  '/worker': ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik'],
  '/bekat-boshlighi': ['bekat_boshlighi'],
  '/bekat-navbatchisi': ['bekat_navbatchisi'],
  '/yul-ustasi': ['yul_ustasi'],
  '/ech-xodimi': ['ech_xodimi'],
  '/mehnat-muhofazasi': ['mehnat_muhofazasi'],
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  const matchedRoute = Object.keys(PROTECTED_ROUTES).find(route =>
    pathname.startsWith(route)
  )

  const isLoginPage = pathname === '/'

  // Himoyalanmagan sahifa (va login sahifasi emas) — darhol ruxsat (auth so'roviga hojat yo'q)
  if (!matchedRoute && !isLoginPage) return supabaseResponse

  // ── XAVFSIZLIK ANKORI ──
  // getUser() JWT ni Auth serverida tekshiradi (getSession()'dan farqli).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Login qilinmagan — login sahifasida qolsin, boshqa joydan loginga o'tsin
  if (!user) {
    if (isLoginPage) return supabaseResponse
    return redirectTo(request, supabaseResponse, '/')
  }

  // ── ROL: avval imzolangan JWT ichidan (DB so'rovisiz) ──
  // Custom Access Token Hook rolni token'ga `user_role` claim sifatida
  // qo'shadi. getUser() aynan shu token'ni tekshirgani uchun claim'ga
  // ishonish mumkin. Bu har bir navigatsiyadagi DB so'rovini yo'q qiladi.
  // getSession() token'ni cookie'dan lokal o'qiydi (tarmoq so'rovi yo'q).
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let userRole = getRoleFromToken(session?.access_token)

  // Fallback: hook hali yoqilmagan yoki eski token (claim yo'q) bo'lsa,
  // DB'dan o'qiymiz — hech narsa buzilmaydi, loop ham yuzaga kelmaydi.
  if (userRole === undefined) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role || null
  }

  // Eskirgan, ishonchsiz cookie'ni tozalaymiz
  supabaseResponse.cookies.set('user-role', '', { maxAge: 0, path: '/' })

  if (!userRole) {
    if (isLoginPage) return supabaseResponse
    return redirectTo(request, supabaseResponse, '/')
  }

  const correctPath = ROLE_HOME[userRole] || '/'

  // Tizimga kirgan foydalanuvchi loginga kirmoqchi bo'lsa, o'z sahifasiga yo'naltiramiz
  if (isLoginPage) {
    return redirectTo(request, supabaseResponse, correctPath)
  }

  const allowedRoles = PROTECTED_ROUTES[matchedRoute!] || []

  // Rol mos kelmasa — o'z sahifasiga qaytaramiz
  if (!allowedRoles.includes(userRole)) {
    return redirectTo(request, supabaseResponse, correctPath)
  }

  return supabaseResponse
}

/** Redirect yasab, sessiya cookie'larini unga ko'chiradi */
function redirectTo(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string
): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  const redirectResponse = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach(cookie => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return redirectResponse
}
