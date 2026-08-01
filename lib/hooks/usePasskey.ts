'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'
import { classifyPasskeyError } from '@/lib/auth/passkey'
import {
  getPasskeyFlagServerSnapshot,
  getPasskeyFlagSnapshot,
  setPasskeyFlag,
  subscribePasskeyFlag,
} from '@/lib/auth/login-hints'
import type { useToast } from './useToast'

/**
 * Toast API chaqiruvchidan olinadi (hook ichida `useToast()` chaqirib
 * bo'lmaydi — u har bir instansiya uchun ALOHIDA ro'yxat yaratadi va uni
 * hech kim `ToastContainer`da ko'rsatmagani uchun xabarlar ko'rinmay qolardi).
 */
type ToastApi = Pick<ReturnType<typeof useToast>, 'success' | 'error'>

// Ikkita tugma (yon panel va "Yana" menyusi) bir vaqtda bosilib, ikkita
// WebAuthn marosimi ustma-ust tushmasligi uchun modul darajasidagi qulf.
//
// `loading` HAM shu yerda, modul darajasida saqlanadi (avval har bir tugma
// o'zining alohida `useState`iga ega edi). Aks holda: yon paneldagi tugma
// bosilib jarayon ketayotganda "Yana" menyusidagi tugma hali ham "bo'sh"
// ko'rinardi — bosilsa `inFlight` qulfi darhol chiqib ketardi-yu, lekin
// foydalanuvchiga hech qanday belgi (spinner/xabar) ko'rsatilmasdi.
let inFlight = false
const loadingListeners = new Set<() => void>()

function setInFlight(value: boolean): void {
  inFlight = value
  loadingListeners.forEach((listener) => listener())
}

function subscribeLoading(listener: () => void): () => void {
  loadingListeners.add(listener)
  return () => {
    loadingListeners.delete(listener)
  }
}

function getLoadingSnapshot(): boolean {
  return inFlight
}

function getLoadingServerSnapshot(): boolean {
  return false
}

/**
 * Barmoq izi (passkey) ON/OFF boshqaruvi — yon panel va "Yana" menyusi uchun
 * umumiy. Ilgari bu ~50 qator mantiq `AppSidebar.tsx` va `worker/page.tsx`da
 * ikki marta nusxalangan edi va har ikkalasi mount paytida `passkey.list()`
 * chaqirar edi — ya'ni har sahifa ochilishida IKKITA bir xil tarmoq so'rovi.
 *
 * Endi mount paytida tarmoq so'rovi umuman yo'q: boshlang'ich holat lokal
 * bayroqdan o'qiladi. Bu shunchaki tezroq emas, balki TO'G'RIROQ ham —
 * passkey qurilmaga bog'langan, serverdagi ro'yxat esa boshqa telefonlardagi
 * kalitlarni ham sanaydi va "shu qurilmada ulanganmi?" degan savolga noto'g'ri
 * javob berardi.
 */
export function usePasskey(toast: ToastApi) {
  // `success`/`error` — `useToast` ichida `useCallback` bilan barqarorlashtirilgan,
  // shuning uchun ularni bevosita dep sifatida ishlatsak bo'ladi.
  const { success, error: showError } = toast

  const hasPasskey = useSyncExternalStore(
    subscribePasskeyFlag,
    getPasskeyFlagSnapshot,
    getPasskeyFlagServerSnapshot
  )
  const loading = useSyncExternalStore(
    subscribeLoading,
    getLoadingSnapshot,
    getLoadingServerSnapshot
  )

  const toggle = useCallback(async () => {
    if (inFlight) return
    setInFlight(true)

    try {
      if (hasPasskey) {
        const { data: passkeys, error } = await supabase.auth.passkey.list()
        if (error) throw error
        // Ketma-ket emas, parallel o'chiramiz
        await Promise.all(
          (passkeys ?? []).map((pk) => supabase.auth.passkey.delete({ passkeyId: pk.id }))
        )
        setPasskeyFlag(false)
        success("Barmoq izi (Face ID) o'chirildi.")
      } else {
        // MUHIM: bu yerda ataylab Supabase'ning tayyor, bitta chaqiruvli
        // `registerPasskey()` metodi ishlatiladi (challenge'ni oldindan
        // olib, ikki bosqichga bo'lish O'RNIGA). Sinab ko'rilgandi — ikki
        // bosqichli, qo'lda yozilgan variant Android'da "credential
        // manager" xatosini chiqargan edi; Supabase'ning o'z (ko'proq
        // sinovdan o'tgan) implementatsiyasi buni to'g'ri boshqaradi.
        const { error } = await supabase.auth.registerPasskey()
        if (error) throw error
        setPasskeyFlag(true)
        success('Barmoq izi muvaffaqiyatli ulandi! Endi loginga shu orqali kira olasiz.')
      }
    } catch (err) {
      const kind = classifyPasskeyError(err)
      // Foydalanuvchi o'zi bekor qilgan bo'lsa — bezovta qilmaymiz
      if (kind === 'cancelled') return

      if (kind === 'network') {
        showError("Internet aloqasi yo'q. Keyinroq urinib ko'ring.")
      } else if (kind === 'unsupported') {
        showError("Bu qurilma yoki brauzer barmoq izini qo'llab-quvvatlamaydi.")
      } else {
        console.error('Passkey toggle error:', err)
        // Sababni ANIQ ko'rsatamiz — Supabase server xatolari (masalan,
        // "Auth session missing!" yoki loyihada Passkeys yoqilmaganligi)
        // WebAuthn nomlari bilan tanilmaydi, shuning uchun avval umumiy
        // xabar bilan yashiringan edi. Mobil qurilmada DevTools ochib
        // bo'lmasligi mumkin, shuning uchun xabarning o'zi kifoya qilishi
        // kerak.
        const detail = err instanceof Error && err.message ? `: ${err.message}` : ''
        showError(`Barmoq izi sozlamasida xatolik yuz berdi${detail}`)
      }
    } finally {
      setInFlight(false)
    }
  }, [hasPasskey, success, showError])

  return { hasPasskey, loading, toggle }
}
