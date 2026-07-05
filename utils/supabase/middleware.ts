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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const matchedRoute = Object.keys(PROTECTED_ROUTES).find(route =>
    pathname.startsWith(route)
  )

  // Himoyalanmagan sahifa — darhol ruxsat
  if (!matchedRoute) return supabaseResponse

  // Login qilinmagan — login sahifasiga
  if (!user) {
    return redirectTo(request, supabaseResponse, '/')
  }

  // ── XAVFSIZLIK: Rol HAR DOIM ma'lumotlar bazasidan olinadi. ──
  // Eski `user-role` cookie mijoz tomonidan soxtalashtirilishi mumkin edi,
  // shuning uchun unga endi ISHONILMAYDI va u o'chiriladi.
  // users.id — primary key, bu so'rov indeksli va juda tez (~1-2ms).
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || null

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
