import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Himoyalangan sahifalar va ularning ruxsat etilgan rollari
const PROTECTED_ROUTES: Record<string, string[]> = {
  '/dispatcher': ['dispatcher'],
  '/worker': ['worker', 'katta_elektromexanik', 'elektromexanik'],
  '/bekat-boshlighi': ['bekat_boshlighi'],
}

// Rolga mos sahifa
const ROLE_HOME: Record<string, string> = {
  dispatcher: '/dispatcher',
  worker: '/worker',
  katta_elektromexanik: '/worker',
  elektromexanik: '/worker',
  bekat_boshlighi: '/bekat-boshlighi',
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Faqat himoyalangan sahifalarni tekshiramiz
  const matchedRoute = Object.keys(PROTECTED_ROUTES).find(route =>
    pathname.startsWith(route)
  )

  if (!matchedRoute) return NextResponse.next()

  // Biz tizimga kirganda "user_role" deb nomlangan cookie yozdik
  const roleCookie = req.cookies.get('user_role')
  const userRole = roleCookie?.value

  if (!userRole) {
    // Agar cookie yo'q bo'lsa (tizimda emas) - login ga yuboramiz
    return NextResponse.redirect(new URL('/', req.url))
  }

  const allowedRoles = PROTECTED_ROUTES[matchedRoute] || []

  // Rolga ruxsat berilmagan bo'lsa (masalan worker /dispatcher ga kirmoqchi)
  if (!allowedRoles.includes(userRole)) {
    const correctPath = ROLE_HOME[userRole] || '/'
    return NextResponse.redirect(new URL(correctPath, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dispatcher/:path*', '/worker/:path*', '/bekat-boshlighi/:path*'],
}
