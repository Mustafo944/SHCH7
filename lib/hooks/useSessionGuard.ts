'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCachedSession, signOut } from '@/lib/supabase-db'
import type { User, Role } from '@/types'

/**
 * Sessiyani tekshiradi va foydalanuvchini to'g'ri sahifaga yo'naltiradi.
 * Agar role mos kelmasa yoki sessiya yo'q bo'lsa, login sahifasiga qaytaradi.
 */
export function useSessionGuard(expectedRole: Role | Role[]) {
  const router = useRouter()
  const [session, setSession] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // expectedRole massiv referansini barqarorlashtirish
  const expectedRoleRef = useRef(expectedRole)
  expectedRoleRef.current = expectedRole

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const user = await getCachedSession()

        if (cancelled) return

        if (!user) {
          await signOut()
          router.replace('/')
          return
        }

        const allowedRoles = Array.isArray(expectedRoleRef.current) ? expectedRoleRef.current : [expectedRoleRef.current]

        if (!allowedRoles.includes(user.role)) {
          // Rolga mos sahifaga yo'naltirish
          if (user.role === 'dispatcher') router.replace('/dispatcher')
          else if (user.role === 'bekat_boshlighi') router.replace('/bekat-boshlighi')
          else if (user.role === 'bekat_navbatchisi') router.replace('/bekat-navbatchisi')
          else if (user.role === 'yul_ustasi') router.replace('/yul-ustasi')
          else if (user.role === 'ech_xodimi') router.replace('/ech-xodimi')
          else router.replace('/worker')
          return
        }

        setSession(user)
      } catch {
        await signOut()
        router.replace('/')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    return () => { cancelled = true }
  }, [router])

  const handleSignOut = useCallback(async () => {
    // 1. Server tomonida Supabase session cookielarini tozalash
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // Agar server so'rovi ishlamasa, davom etamiz
    }
    // 2. Client tomonida ham tozalash
    await signOut()
    // 3. Sahifani to'liq qayta yuklash (brauzer kesh va React state tozalanadi)
    window.location.href = '/'
  }, [])

  return { session, loading, handleSignOut }
}
