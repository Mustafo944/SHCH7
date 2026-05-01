import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // req va res orqali cookielarni yangilaymiz
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
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
    '/worker': ['worker', 'elektromexanik', 'elektromontyor'],
    '/bekat-boshlighi': ['bekat_boshlighi', 'bekat_navbatchisi'],
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
    return NextResponse.redirect(url)
  }

  let userRole = request.cookies.get('user-role')?.value
  
  if (!userRole) {
    // Foydalanuvchining ma'lumotlarini (role) bazadan tortamiz
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    userRole = profile?.role

    if (userRole) {
      // Role ni cookie ga saqlaymiz, keyingi so'rovlar tez bo'lishi uchun
      supabaseResponse.cookies.set('user-role', userRole, { maxAge: 86400, path: '/' })
    }
  }

  if (!userRole) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  const allowedRoles = PROTECTED_ROUTES[matchedRoute] || []

  // Agar rolga ruxsat yetarli bo'lmasa, uni o'z sahifasiga qaytaramiz
  if (!allowedRoles.includes(userRole)) {
    const ROLE_HOME: Record<string, string> = {
      dispatcher: '/dispatcher',
      worker: '/worker',
      elektromexanik: '/worker',
      elektromontyor: '/worker',
      bekat_boshlighi: '/bekat-boshlighi',
      bekat_navbatchisi: '/bekat-boshlighi',
    }
    const correctPath = ROLE_HOME[userRole] || '/'
    const url = request.nextUrl.clone()
    url.pathname = correctPath
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
