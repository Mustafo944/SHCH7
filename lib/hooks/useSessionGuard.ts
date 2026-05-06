'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentSession, signOut } from '@/lib/supabase-db'
import type { User, Role } from '@/types'

/**
 * Sessiyani tekshiradi va foydalanuvchini to'g'ri sahifaga yo'naltiradi.
 * Agar role mos kelmasa yoki sessiya yo'q bo'lsa, login sahifasiga qaytaradi.
 */
export function useSessionGuard(expectedRole: Role | Role[]) {
  const router = useRouter()
  const [session, setSession] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const user = await getCurrentSession()

        if (cancelled) return

        if (!user) {
          await signOut()
          router.replace('/')
          return
        }

        const allowedRoles = Array.isArray(expectedRole) ? expectedRole : [expectedRole]

        if (!allowedRoles.includes(user.role)) {
          // Rolga mos sahifaga yo'naltirish
          if (user.role === 'dispatcher') router.replace('/dispatcher')
          else if (user.role === 'bekat_boshlighi' || user.role === 'bekat_navbatchisi') router.replace('/bekat-boshlighi')
          else if (user.role === 'yul_ustasi') router.replace('/yul-ustasi')
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
  }, [router, expectedRole])

  const handleSignOut = useCallback(async () => {
    await signOut()
    router.push('/')
  }, [router])

  return { session, loading, handleSignOut }
}
