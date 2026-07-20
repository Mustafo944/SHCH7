import type { DU46Entry } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// DU-46 TASDIQLASH ZANJIRI — YAGONA MANBA
// ═══════════════════════════════════════════════════════════════════════════════
// Bu fayl DU-46 "kim hozir tasdiqlashi kerak" mantig'ining YAGONA JS
// implementatsiyasi. Ilgari bu mantiq DU46JournalView.tsx (UI) va
// lib/supabase-db.ts (getPendingJournalCounts fallback) ichida ikki marta
// mustaqil yozilgan edi va vaqt o'tishi bilan farqlanib ketgan (masalan,
// bekat_navbatchisi'ni talab qilinadigan tasdiqlovchilar ro'yxatidan chiqarib
// tashlash va "Tugadi" bosgan odamni ism bo'yicha aniqlash faqat UI
// versiyasida bor edi) — natijada bosh sahifadagi "kutilmoqda" belgisi
// haqiqiy holatga mos kelmasligi mumkin edi.
//
// supabase/migrations/*_du46_approval_sync.sql dagi SQL RPC (_du46_next_role)
// ham shu funksiyaning qo'lda ko'chirilgan nusxasi — shu yerda mantiq
// o'zgartirilsa, o'sha SQL ham yangilanishi kerak.

export const DU46_WORKER_GROUP_ROLES = ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik']

export function getCreator(e: Pick<DU46Entry, 'createdByRole'>): string {
  return e.createdByRole || 'worker'
}

type ApprovalEntryLike = Pick<
  DU46Entry,
  | 'kamchilikBajarildi'
  | 'bartarafBajarildi'
  | 'approvalChain'
  | 'approvalsCol3'
  | 'approvalsCol12'
  | 'createdByRole'
  | 'kamchilikBBTasdiqladi'
  | 'bartarafBBTasdiqladi'
  | 'bartarafByRole'
  | 'bartarafImzo'
  | 'kamchilikImzo'
>

/**
 * Berilgan ustun (3 yoki 12) uchun keyingi tasdiqlashi kerak bo'lgan rolni
 * qaytaradi. 'DSP' — bekat navbatchisi navbatda degani. Hech kim kutilmasa
 * (hali boshlanmagan yoki hammasi tasdiqlangan) — null.
 */
export function getNextApproverRole(e: ApprovalEntryLike, col: 3 | 12): string | null {
  const isBoshlandi = col === 3 ? e.kamchilikBajarildi : e.bartarafBajarildi
  if (!isBoshlandi) return null

  const chain = e.approvalChain || []
  const approvals = col === 3 ? (e.approvalsCol3 || []) : (e.approvalsCol12 || [])

  if (col === 3) {
    if (approvals.length < chain.length) return chain[approvals.length]

    const creatorRole = getCreator(e)
    if (creatorRole === 'bekat_navbatchisi') return null

    // Boshqalar yaratgan bo'lsa bekat navbatchisi tomonidan tasdiqlanadi
    if (!e.kamchilikBBTasdiqladi) return 'DSP'

    return null
  } else {
    // ═══════════════════════════════════════════════════════════════════
    // 12-USTUN TASDIQLASH MANTIQI
    // ═══════════════════════════════════════════════════════════════════
    //
    // Qoidalar:
    // 1) 3-ustunda kim qatnashgan bo'lsa (creator + chain), 12-ustunda ham shu rollar
    //    "Tugadi" tugmasini bosishi va tasdiqlashi mumkin.
    // 2) Kim "Tugadi" bosgan bo'lsa — o'sha rol pastdan qaytib tasdiqlamaydi.
    // 3) Qolgan rollar chain tartibida tasdiqlaydi.
    // 4) Eng OXIRIDA doim BEKAT NAVBATCHISI tasdiqlaydi
    //    (agar BB o'zi Tugadi bosmagan bo'lsa).
    // ═══════════════════════════════════════════════════════════════════

    const creatorRole = getCreator(e)
    const tugadiRole = e.bartarafByRole || creatorRole  // haqiqiy rol: 'katta_elektromexanik'
    const tugadiName = e.bartarafImzo || ''              // ism: 'Olimov Olim'
    const creatorName = e.kamchilikImzo || ''             // 3-ustunni boshlagan ism

    // "Tugadi" bosgan odam = creator mi? (ism orqali aniqlash, chunki createdByRole='worker' ga map qilingan)
    const creatorIsTugadiPresser =
      creatorRole === tugadiRole ||
      (creatorName !== '' && tugadiName !== '' && creatorName === tugadiName)

    // Chain a'zo = Tugadi bosgan odam mi? (exact match — chain haqiqiy rollarni saqlaydi)
    const isChainMemberTugadi = (role: string): boolean => role === tugadiRole

    // Col12 uchun tasdiqlash kerak bo'lgan rollar ro'yxatini tuzamiz (tartib saqlanadi)
    const requiredApprovers: string[] = []

    // Creator (agar Tugadi bosmagan bo'lsa — bekat_boshlighi ham tasdiqlash zanjirida bo'ladi)
    // Bekat navbatchisi zanjirga oddiy a'zo sifatida kirmaydi, u oxirida alohida 'DSP' sifatida tasdiqlaydi.
    if (!creatorIsTugadiPresser && creatorRole !== 'bekat_navbatchisi') {
      requiredApprovers.push(creatorRole)
    }

    // Chain a'zolari (Tugadi bosgan roldan boshqalari)
    chain.forEach(r => {
      if (!isChainMemberTugadi(r) && !requiredApprovers.includes(r)) {
        requiredApprovers.push(r)
      }
    })

    // Hali tasdiqlamagan keyingi rolni topamiz
    const nextRequired = requiredApprovers.find(r => {
      return !approvals.some(a => {
        // 'worker' sifatida saqlangan creator uchun — worker guruhidagi har qanday rol mos keladi
        if (DU46_WORKER_GROUP_ROLES.includes(r) && DU46_WORKER_GROUP_ROLES.includes(a.role)) return true
        return a.role === r
      })
    })

    if (nextRequired) return nextRequired

    // Barcha chain ishtirokchilari tasdiqladi — endi bekat navbatchisi tasdiqlaydi
    // Agar bekat_navbatchisi o'zi "Tugadi" bosgan bo'lsa — qayta tasdiqlamaydi
    // Bekat boshlig'i Tugadi bossa ham, bekat navbatchisi tasdiqlashi kerak
    if (tugadiRole !== 'bekat_navbatchisi' && !e.bartarafBBTasdiqladi) return 'DSP'

    return null
  }
}
