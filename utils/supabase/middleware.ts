import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  const PROTECTED_ROUTES: Record<string, string[]> = {
    '/dispatcher': ['dispatcher'],
    '/worker': ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik'],
    '/bekat-boshlighi': ['bekat_boshlighi'],
    '/bekat-navbatchisi': ['bekat_navbatchisi'],
    '/yul-ustasi': ['yul_ustasi'],
    '/ech-xodimi': ['ech_xodimi'],
  }

  const matchedRoute = Object.keys(PROTECTED_ROUTES).find(route =>
    pathname.startsWith(route)
  )

  // Himoyalanmagan sahifa bo'lsa darhol ruxsat beramiz
  if (!matchedRoute) return supabaseResponse

  // Agar foydalanuvchi tizimga kirmagan bo'lsa, asosiy sahifaga (login) jo'natamiz
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // Foydalanuvchining ma'lumotlarini (role) bazadan tortamiz (aniqlik uchun har doim bazadan tekshiriladi)
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role

  if (userRole) {
    // Role ni cookie ga saqlaymiz, keyingi so'rovlar tez bo'lishi uchun
    supabaseResponse.cookies.set('user-role', userRole, { maxAge: 86400, path: '/', sameSite: 'lax', secure: true, httpOnly: false })
  }

  if (!userRole) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  const allowedRoles = PROTECTED_ROUTES[matchedRoute] || []

  // Agar rolga ruxsat yetarli bo'lmasa, uni o'z sahifasiga qaytaramiz
  if (!allowedRoles.includes(userRole)) {
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
    }
    const correctPath = ROLE_HOME[userRole] || '/'
    const url = request.nextUrl.clone()
    url.pathname = correctPath
    const redirectResponse = NextResponse.redirect(url)
    // redirect responsega ham cookielarni yopishtirish:
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}
