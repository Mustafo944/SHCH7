import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

// Rol → o'z bosh sahifasi
const ROLE_HOME: Record<string, string> = {
  dispatcher: '/dispatcher',
  worker: '/worker',
  elektromexanik: '/worker',
  elektromontyor: '/worker',
  katta_elektromexanik: '/worker',
  bekat_boshlighi: '/bekat-boshlighi',
  bekat_navbatchisi: '/bekat-navbatchisi',
  yul_ustasi: '/yul-ustasi',
  ech_xodimi: '/ech-xodimi',
  mehnat_muhofazasi: '/mehnat-muhofazasi',
}

/**
 * JWT'ning `user_role` claim'ini o'qiydi (Custom Access Token Hook qo'shadi).
 *   - `string`    → rol topildi (DB so'roviga hojat yo'q)
 *   - `null`      → claim bor, lekin rol yo'q (role'siz akkaunt)
 *   - `undefined` → claim yo'q / dekod muvaffaqiyatsiz → DB fallback ishlaydi
 *
 * Bu token'ni getUser() allaqachon Auth serverida tekshirgani uchun
 * uning claim'lariga ishonish xavfsiz. Faqat lokal dekod (imzo qayta
 * tekshirilmaydi, chunki bu allaqachon bajarilgan).
 */
function getRoleFromToken(accessToken?: string): string | null | undefined {
  if (!accessToken) return undefined
  const parts = accessToken.split('.')
  if (parts.length !== 3) return undefined
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64)) as Record<string, unknown>
    if (!('user_role' in payload)) return undefined
    const role = payload.user_role
    return typeof role === 'string' ? role : null
  } catch {
    return undefined
  }
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

  // Himoyalanmagan sahifa — darhol ruxsat (auth so'roviga hojat yo'q)
  if (!matchedRoute) return supabaseResponse

  // ── XAVFSIZLIK ANKORI ──
  // getUser() JWT ni Auth serverida tekshiradi (getSession()'dan farqli).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Login qilinmagan — login sahifasiga
  if (!user) {
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
    return redirectTo(request, supabaseResponse, '/')
  }

  const allowedRoles = PROTECTED_ROUTES[matchedRoute] || []

  // Rol mos kelmasa — o'z sahifasiga qaytaramiz
  if (!allowedRoles.includes(userRole)) {
    const correctPath = ROLE_HOME[userRole] || '/'
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
