/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import type { DU46Entry } from '@/types'
import { Plus, Trash2, CheckCircle2, Download, ChevronLeft } from 'lucide-react'
import { getCurrentJournalMonth, isMonthInPast, getJournalMonthLabel } from './helpers'
import { TaskSelectModal, DateInput, TimeInput } from './JournalSelectModal'
import { ApprovalChainModal } from './ApprovalChainModal'

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL COMPONENTS (PREVENT EXCESSIVE RE-RENDERS)
// ═══════════════════════════════════════════════════════════════════════════════

const LocalTextarea = ({ value, onChange, readOnly, className, rows, spellCheck, lang }: any) => {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])
  
  useEffect(() => {
    if (val !== value) {
      const timer = setTimeout(() => onChange(val), 50)
      return () => clearTimeout(timer)
    }
  }, [val, value, onChange])

  return (
    <textarea
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== value) onChange(val) }}
      readOnly={readOnly}
      className={className}
      rows={rows}
      spellCheck={spellCheck}
      lang={lang}
    />
  )
}

const LocalInput = ({ value, onChange, readOnly, className, placeholder }: any) => {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])

  useEffect(() => {
    if (val !== value) {
      const timer = setTimeout(() => onChange(val), 50)
      return () => clearTimeout(timer)
    }
  }, [val, value, onChange])

  return (
    <input
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== value) onChange(val) }}
      readOnly={readOnly}
      className={className}
      placeholder={placeholder}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY ENTRY FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

const EMPTY_DU46 = (month?: string): DU46Entry => ({
  nomber: '',
  oyKun1: '', soatMinut1: '', kamchilik: '',
  oyKun2: '', soatMinut2: '', xabarUsuli: '',
  oyKun3: '', soatMinut3: '', dspImzo: '',
  oyKun4: '', soatMinut4: '', bartarafInfo: '',
  // Ustun 3
  kamchilikBajarildi: false, kamchilikBajarildiAt: '', kamchilikImzo: '',
  kamchilikBBTasdiqladi: false, kamchilikBBTasdiqladiAt: '', kamchilikBBImzo: '', kamchilikBBVaqt: '',
  // Ustun 12
  bartarafBajarildi: false, bartarafBajarildiAt: '', bartarafImzo: '',
  bartarafBBTasdiqladi: false, bartarafBBTasdiqladiAt: '', bartarafBBImzo: '', bartarafBBVaqt: '',
  // Umumiy
  yuborildi: false,
  // Bug #16 fix: journalMonth ni boshdan belgilash
  journalMonth: month,
})

// ═══════════════════════════════════════════════════════════════════════════════
// DU-46 JURNAL KO'RINISHI
// ═══════════════════════════════════════════════════════════════════════════════

export function DU46JournalView({
  stationId,
  stationName,
  userName,
  userRole,
  journalMonth = getCurrentJournalMonth(),
  onClose,
  onAccepted,
}: {
  stationId: string
  stationName: string
  userName: string
  userRole: string
  journalMonth?: string
  onClose: () => void
  onAccepted?: () => void
}) {
  const [entries, setEntries] = useState<DU46Entry[]>(() => Array.from({ length: 5 }, () => EMPTY_DU46(journalMonth)))
  const [allEntries, setAllEntries] = useState<DU46Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [taskModalIdx, setTaskModalIdx] = useState<number | null>(null)

  // Tasdiqlash zanjirini tanlash modali
  const [approvalChainModal, setApprovalChainModal] = useState<{ index: number, isEdit: boolean, currentChain: string[] } | null>(null)

  // Bugungi sana va tanlangan oy
  const today = new Date()
  const selectedDay = String(today.getDate()).padStart(2, '0')
  const [jYear, jMonth] = (journalMonth || '').split('-')
  const selectedYear = jYear || String(today.getFullYear())
  const selectedMonth = jMonth || String(today.getMonth() + 1).padStart(2, '0')
  const journalMonthLabel = getJournalMonthLabel(journalMonth)

  // ── Rollar ─────────────────────────────────────────────────────────────────────
  const isYulUstasi = userRole === 'yul_ustasi'
  const isEchXodimi = userRole === 'ech_xodimi'
  const isElektromexanik = ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik'].includes(userRole)
  const isWorker = isElektromexanik || isYulUstasi
  const isBB = ['bekat_boshlighi', 'bekat_navbatchisi'].includes(userRole)
  const isDispatcher = userRole === 'dispatcher'
  const isEditor = isWorker || isBB || isEchXodimi

  // ── Joriy oy tekshiruvi ────────────────────────────────────────────────────────
  const isCurrentMonth = journalMonth === getCurrentJournalMonth()

  // ── Xabar ko'rsatish ──────────────────────────────────────────────────────────
  const showMsg = (text: string, duration = 2000) => {
    setMsg(text)
    setTimeout(() => setMsg(null), duration)
  }

  // ── Ma'lumotlarni yuklash ─────────────────────────────────────────────────────
  const loadJournalData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const j = await getJournal(stationId, 'du46')
      if (j && j.entries.length > 0) {
        const loadedAllEntries = j.entries as DU46Entry[]
        setAllEntries(loadedAllEntries)

        // Bug #11 fix: eski qatorlarda journalMonth bo'lmasligi mumkin (migratsiyadan oldin saqlangan).
        // Bunday qatorlarni joriy tanlangan oy uchun ko'rsatamiz (backward compatibility).
        const monthEntries = loadedAllEntries.filter(
          e => e.journalMonth === journalMonth || (!e.journalMonth && !loadedAllEntries.some(x => x.journalMonth))
        )

        if (monthEntries.length > 0) {
          const allSubmitted = monthEntries.every(e => e.yuborildi)
          setEntries(prev => {
            const merged = [...monthEntries]
            if (allSubmitted) {
              // Bug #16 fix: yangi bo'sh qatorlarga joriy oy beriladi
              merged.push(EMPTY_DU46(journalMonth), EMPTY_DU46(journalMonth), EMPTY_DU46(journalMonth))
            }
            for (let i = 0; i < Math.max(merged.length, prev.length); i++) {
              const dbRow = merged[i]
              const localRow = prev[i]
              if (!dbRow && localRow) {
                merged.push(localRow)
              } else if (dbRow && localRow) {
                // Live (realtime) yangilanishlar barcha foydalanuvchilarda bir xil ko'rinishi uchun
                // doim ma'lumotlar bazasidan kelgan eng so'nggi holatni olamiz.
                merged[i] = dbRow
              }
            }
            return merged
          })
        } else {
          setEntries(prev => {
            const hasLocalEdits = prev.some(p => p.kamchilik || p.oyKun1 || p.bartarafInfo)
            if (hasLocalEdits && prev.length > 0) return prev
            // Bug #16 fix: bo'sh qatorlarga joriy oy beriladi
            return Array.from({ length: 5 }, () => EMPTY_DU46(journalMonth))
          })
        }
      } else {
        setAllEntries([])
        setEntries(prev => {
          const hasLocalEdits = prev.some(p => p.kamchilik || p.oyKun1 || p.bartarafInfo)
          if (hasLocalEdits && prev.length > 0) return prev
          // Bug #16 fix: bo'sh qatorlarga joriy oy beriladi
          return Array.from({ length: 5 }, () => EMPTY_DU46(journalMonth))
        })
      }
    } catch (err) {
      console.error('Journal yuklash xatosi:', err)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [stationId, journalMonth])

  useEffect(() => {
    loadJournalData(false)
  }, [loadJournalData])

  useRealtimeSubscription(
    stationId && journalMonth
      ? [
          {
            channelName: `journal_du46_${userRole}_${stationId}_${journalMonth}`,
            table: 'station_journals',
            filter: `station_id=eq.${stationId}`,
            onEvent: () => loadJournalData(true),
          },
        ]
      : [],
    !!stationId && !!journalMonth
  )

  // ── Yordamchi: qaysi rol yaratgan ─────────────────────────────────────────────
  const getCreator = (e: DU46Entry): 'worker' | 'bekat_boshlighi' | 'yul_ustasi' | 'ech_xodimi' => e.createdByRole || 'worker'

  /** Joriy foydalanuvchi qatorni yaratgani (yozuvchi)mi?
   * Bug #4 fix: bekat_navbatchisi faqat tasdiqlovchi — creator emas.
   * Creator aniqlash uchun userRole ni to'g'ridan-to'g'ri tekshiramiz.
   */
  const isCreator = (e: DU46Entry): boolean => {
    const creator = getCreator(e)
    if (creator === 'yul_ustasi') return isYulUstasi
    if (creator === 'ech_xodimi') return isEchXodimi
    if (creator === 'bekat_boshlighi') return isBB // isBB o'z ichiga bekat_navbatchisini ham oladi
    return creator === 'worker' && isWorker
  }

  // ── Yangi Dinamik Tasdiqlash Mantiqi ──
  const getNextApproverRole = (e: DU46Entry, col: 3 | 12): string | null => {
    const isBoshlandi = col === 3 ? e.kamchilikBajarildi : e.bartarafBajarildi
    if (!isBoshlandi) return null
    
    const chain = e.approvalChain || []
    const approvals = col === 3 ? (e.approvalsCol3 || []) : (e.approvalsCol12 || [])
    
    if (col === 3) {
      if (approvals.length < chain.length) return chain[approvals.length]
      
      const creator = getCreator(e)
      if (creator === 'bekat_boshlighi') return null
      
      const isBBTasdiqladi = e.kamchilikBBTasdiqladi
      if (!isBBTasdiqladi) return 'DSP'
      
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

      // Creator (agar BB emas va Tugadi bosmagan bo'lsa)
      if (creatorRole !== 'bekat_boshlighi' && !creatorIsTugadiPresser) {
        requiredApprovers.push(creatorRole)
      }

      // Chain a'zolari (Tugadi bosgan roldan boshqalari)
      chain.forEach(r => {
        if (!isChainMemberTugadi(r) && !requiredApprovers.includes(r)) {
          requiredApprovers.push(r)
        }
      })

      // Worker guruhi rollarini moslashtirish uchun yordamchi
      const workerGroupRoles = ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik']

      // Hali tasdiqlamagan keyingi rolni topamiz
      const nextRequired = requiredApprovers.find(r => {
        return !approvals.some(a => {
          // 'worker' sifatida saqlangan creator uchun — worker guruhidagi har qanday rol mos keladi
          if (workerGroupRoles.includes(r) && workerGroupRoles.includes(a.role)) return true
          return a.role === r
        })
      })

      if (nextRequired) return nextRequired

      // Barcha chain ishtirokchilari tasdiqladi — endi BB tasdiqlaydi
      // Agar BB o'zi "Tugadi" bosgan bo'lsa — BB qayta tasdiqlamaydi
      const bbRoles = ['bekat_boshlighi', 'bekat_navbatchisi']
      if (!bbRoles.includes(tugadiRole) && !e.bartarafBBTasdiqladi) return 'DSP'

      return null
    }
  }


  const isFinalApprover = (e: DU46Entry, col: 3 | 12): boolean => {
    const nextRole = getNextApproverRole(e, col)
    if (!nextRole) return false
    // DSP har doim oxirgi tasdiqlovchi (har ikki ustun uchun ham)
    if (nextRole === 'DSP') return true
    
    // Faqat 3-ustun uchun qo'shimcha tekshiruv:
    // Bekat navbatchisi yozgan bo'lsa va chain'dagi oxirgi xodim tasdiqlash navbatida bo'lsa
    if (col === 3) {
      const chain = e.approvalChain || []
      const approvals = e.approvalsCol3 || []
      if (approvals.length === chain.length - 1) {
        const creator = getCreator(e)
        if (creator === 'bekat_boshlighi') return true
      }
    }
    
    return false
  }

  const isCol3Finished = (e: DU46Entry): boolean => {
    if (e.kamchilikBBTasdiqladi) return true
    const nextRole = getNextApproverRole(e, 3)
    if (e.kamchilikBajarildi && nextRole === null) return true
    return false
  }

  const isCol12Finished = (e: DU46Entry): boolean => {
    if (e.bartarafBBTasdiqladi) return true
    const nextRole = getNextApproverRole(e, 12)
    if (e.bartarafBajarildi && nextRole === null) return true
    return false
  }

  const canIApprove = (e: DU46Entry, col: 3 | 12): boolean => {
    const nextRole = getNextApproverRole(e, col)
    if (!nextRole) return false
    if (nextRole === 'DSP') return isBB
    // Xavfsizlik: 12-ustunda "Tugadi" bosgan odam hech qachon tasdiqlay olmaydi
    if (col === 12 && e.bartarafByRole === userRole) return false
    if (nextRole === 'worker') return isWorker
    return userRole === nextRole
  }

  // Hozir kim tasdiqlashi kerakligini aniqlaydigan yordamchi
  const getWaitingForRole = (e: DU46Entry, col: 3 | 12): string | null => {
    const isBoshlandi = col === 3 ? e.kamchilikBajarildi : e.bartarafBajarildi
    if (!isBoshlandi) return null
    const nextRole = getNextApproverRole(e, col)
    if (!nextRole) return null
    if (nextRole === 'DSP') return 'Bekat navbatchisi'
    if (nextRole === 'worker') return 'Elektromexanik / Xodim'
    return nextRole.replace('_', ' ')
  }

  // ── Input yangilash ───────────────────────────────────────────────────────────
  const update = (i: number, field: keyof DU46Entry, val: string) => {
    const n = [...entries]
    n[i] = { ...n[i], [field]: val }

    // Bug #17 fix: createdByRole ni istalgan maydon o'zgarganda belgilaymiz (faqat 3 ta maydon emas)
    if (!n[i].createdByRole) {
      if (isYulUstasi) n[i].createdByRole = 'yul_ustasi'
      else if (isEchXodimi) n[i].createdByRole = 'ech_xodimi'
      else if (isElektromexanik) n[i].createdByRole = 'worker'
      else if (isBB) n[i].createdByRole = 'bekat_boshlighi' // BB va DSP ham shu rol ostida saqlanadi
    }

    setEntries(n)
  }

  // ── Qator boshqaruvi ─────────────────────────────────────────────────────────
  // Bug #16 fix: yangi qatorlarga journalMonth ni uzatamiz
  const addRow = () => { if (isCurrentMonth) setEntries([...entries, EMPTY_DU46(journalMonth)]) }

  const removeRow = () => {
    if (entries.length <= 1) return
    const lastIdx = entries.length - 1
    const last = entries[lastIdx]
    
    // Boshlandi bosilgan bo'lsa o'chirib bo'lmaydi
    if (last.kamchilikBajarildi) return
    
    // Ma'lumot yozilgan bo'lsa, faqat uni yaratgan odamgina o'chira oladi
    const hasData = last.kamchilik || last.bartarafInfo
    if (hasData && !isCreator(last)) return

    const newEntries = entries.slice(0, -1)
    saveEntries(newEntries, entries, { deletedIndex: lastIdx })
  }

  // ── Saqlash (optimistik & xavfsiz) ─────────────────────────────────────────────
  // Bug #6 fix: rollback uchun snapshot olamiz; allEntries snapshot ni closure'dan emas, useRef dan olamiz.
  const allEntriesRef = useCallback(() => allEntries, [allEntries])

  const saveEntries = async (updated: DU46Entry[], prev: DU46Entry[], options?: { deletedIndex?: number }) => {
    setEntries(updated)
    const prevAllEntries = allEntriesRef()

    try {
      // 1. Bazadagi eng so'nggi holatni olish (Concurrency himoyasi)
      const latestJournal = await getJournal(stationId, 'du46')
      const latestAllEntries = (latestJournal?.entries as DU46Entry[]) || []

      // 2. DB dagi joriy oydagi qatorlarni ajratish
      const dbMonthEntries = latestAllEntries.filter(e => e.journalMonth === journalMonth)

      // Agar qator qasddan o'chirilgan bo'lsa, uni DB'dagi ro'yxatdan olib tashlaymiz
      if (options?.deletedIndex !== undefined && options.deletedIndex < dbMonthEntries.length) {
        dbMonthEntries.splice(options.deletedIndex, 1)
      }

      // 3. Mahalliy va DB dagi qatorlarni birlashtirish
      const mergedMonthEntries = [...updated]
      for (let i = 0; i < Math.max(mergedMonthEntries.length, dbMonthEntries.length); i++) {
        const local = mergedMonthEntries[i]
        const db = dbMonthEntries[i]

        if (!local && db) {
          // Boshqa foydalanuvchi yangi qator qo'shgan
          mergedMonthEntries.push(db)
        } else if (local && db) {
          // Bug #7 fix: approvalsCol3/12 ham himoyalanadi — DB'da ko'proq imzo bo'lsa saqlanadi
          const mergeApprovals = (
            localList: typeof local.approvalsCol3,
            dbList: typeof db.approvalsCol3
          ) => {
            if (!dbList || dbList.length === 0) return localList || []
            if (!localList || localList.length === 0) return dbList
            return dbList.length >= localList.length ? dbList : localList
          }

          let merged = { ...local }

          // Tasdiqlash holatlarini DB'dan himoyalab olamiz (false→true yo'nalishda)
          if (!local.kamchilikBajarildi && db.kamchilikBajarildi) {
            merged = { ...merged, kamchilikBajarildi: db.kamchilikBajarildi, kamchilikBajarildiAt: db.kamchilikBajarildiAt, kamchilikImzo: db.kamchilikImzo, createdByRole: db.createdByRole }
          }
          if (!local.bartarafBajarildi && db.bartarafBajarildi) {
            merged = { ...merged, bartarafBajarildi: db.bartarafBajarildi, bartarafBajarildiAt: db.bartarafBajarildiAt, bartarafImzo: db.bartarafImzo, bartarafByRole: db.bartarafByRole }
          }
          if (!local.kamchilikBBTasdiqladi && db.kamchilikBBTasdiqladi) {
            merged = { ...merged, kamchilikBBTasdiqladi: db.kamchilikBBTasdiqladi, kamchilikBBTasdiqladiAt: db.kamchilikBBTasdiqladiAt, kamchilikBBImzo: db.kamchilikBBImzo, kamchilikBBVaqt: db.kamchilikBBVaqt }
          }
          if (!local.bartarafBBTasdiqladi && db.bartarafBBTasdiqladi) {
            merged = { ...merged, bartarafBBTasdiqladi: db.bartarafBBTasdiqladi, bartarafBBTasdiqladiAt: db.bartarafBBTasdiqladiAt, bartarafBBImzo: db.bartarafBBImzo, bartarafBBVaqt: db.bartarafBBVaqt }
          }
          // Bug #7: imzolar massivini birlashtirish
          merged = {
            ...merged,
            approvalsCol3: mergeApprovals(local.approvalsCol3, db.approvalsCol3),
            approvalsCol12: mergeApprovals(local.approvalsCol12, db.approvalsCol12),
          }

          mergedMonthEntries[i] = merged
        }
      }

      // Boshqa oylardagi qatorlarni ham DB dan olib saqlaymiz
      const otherMonths = latestAllEntries.filter(e => e.journalMonth !== journalMonth)
      const mergedWithMonth = mergedMonthEntries.map(e => ({ ...e, journalMonth }))
      const newAllEntries = [...otherMonths, ...mergedWithMonth]

      setAllEntries(newAllEntries)
      setEntries(mergedMonthEntries)

      await upsertJournal(stationId, 'du46', newAllEntries, userName)
    } catch (err) {
      // Bug #6 fix: snapshot'dan to'g'ri rollback
      console.error('Saqlash xatosi:', err)
      setEntries(prev)
      setAllEntries(prevAllEntries)
      showMsg(err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi', 3000)
      throw err
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // USTUN 3: BOSHLANDI + TASDIQLASH
  // ══════════════════════════════════════════════════════════════════════════════

  const handleKamchilikBoshlandiClick = (i: number) => {
    setApprovalChainModal({ index: i, isEdit: false, currentChain: [] })
  }

  const handleSaveApprovalChain = async (idx: number, chain: string[]) => {
    const prev = [...entries]
    const updated = [...entries]
    const e = updated[idx]
    
    if (approvalChainModal?.isEdit) {
      updated[idx] = { ...e, approvalChain: chain }
    } else {
      updated[idx] = {
        ...e,
        kamchilikBajarildi: true,
        kamchilikBajarildiAt: new Date().toISOString(),
        kamchilikImzo: userName,
        approvalChain: chain,
        approvalsCol3: [],
        approvalsCol12: []
      }
    }
    
    try {
      const isEdit = approvalChainModal?.isEdit
      setApprovalChainModal(null)
      showMsg(isEdit ? 'Tasdiqlash zanjiri yangilandi!' : 'Boshlandi belgilandi!')
      if (!isEdit) onAccepted?.()
      
      await saveEntries(updated, prev)
    } catch { /* */ }
  }

  const handleKamchilikTasdiqlash = async (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    // Bug #1 fix: e ni joriy entries state'dan olamiz (stale closure muammosidan himoya)
    const e = entries[i]
    const nextRole = getNextApproverRole(e, 3)

    if (isBB) {
      // Bug #1 fix: kamchilikBBVaqt ni e'dan spread qilib olamiz (u update() orqali state'ga yozilgan)
      updated[i] = {
        ...e,
        kamchilikBBTasdiqladi: true,
        kamchilikBBTasdiqladiAt: new Date().toISOString(),
        kamchilikBBImzo: userName,
        kamchilikBBVaqt: e.kamchilikBBVaqt, // explicit — chapdan qolib ketmasligi uchun
      }
    } else if (nextRole) {
      const newApprovals = [...(e.approvalsCol3 || [])]
      newApprovals.push({ role: nextRole, signedBy: userName, signedAt: new Date().toISOString() })
      updated[i] = { ...e, approvalsCol3: newApprovals }
    }

    try {
      await saveEntries(updated, prev)
      showMsg('Tasdiqlandi!')
    } catch { /* */ }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // USTUN 12: BAJARILDI + TASDIQLASH
  // ══════════════════════════════════════════════════════════════════════════════

  const handleBartarafBajarildiClick = (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    updated[i] = {
      ...updated[i],
      bartarafBajarildi: true,
      bartarafBajarildiAt: new Date().toISOString(),
      bartarafImzo: userName,
      bartarafByRole: userRole,
    }
    if (onAccepted) onAccepted()
    showMsg('Bajarildi belgilandi!')
    saveEntries(updated, prev).catch(() => {})
  }

  const handleBartarafTasdiqlash = async (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    // Bug #2 fix: e ni joriy entries state'dan olamiz
    const e = entries[i]
    const nextRole = getNextApproverRole(e, 12)

    if (isBB) {
      // Bug #2 fix: bartarafBBVaqt ni e'dan explicit yozamiz
      updated[i] = {
        ...e,
        bartarafBBTasdiqladi: true,
        bartarafBBTasdiqladiAt: new Date().toISOString(),
        bartarafBBImzo: userName,
        bartarafBBVaqt: e.bartarafBBVaqt, // explicit — chapdan qolib ketmasligi uchun
      }
    } else if (nextRole) {
      const newApprovals = [...(e.approvalsCol12 || [])]
      newApprovals.push({ role: nextRole, signedBy: userName, signedAt: new Date().toISOString() })
      updated[i] = { ...e, approvalsCol12: newApprovals }
    }

    try {
      await saveEntries(updated, prev)
      showMsg('Tasdiqlandi!')
    } catch { /* */ }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // DISPETCHERGA YUBORISH / QABUL QILISH
  // ══════════════════════════════════════════════════════════════════════════════

  const handleDispetchergaYuborish = async () => {
    const prev = [...entries]
    const updated = entries.map(e => {
      if (!e.yuborildi && (e.kamchilik || e.bartarafInfo) && e.kamchilikBBTasdiqladi && e.bartarafBBTasdiqladi) {
        return { ...e, yuborildi: true, dispetcherQabulQildi: false }
      }
      return e
    })
    try {
      await saveEntries(updated, prev)
      showMsg('Yuborildi!')
    } catch { /* */ }
  }

  const handleDispetcherQabulQilish = async () => {
    const prev = [...entries]
    const updated = entries.map(e =>
      e.yuborildi && !e.dispetcherQabulQildi
        ? { ...e, dispetcherQabulQildi: true, dispetcherImzo: userName }
        : e
    )
    try {
      await saveEntries(updated, prev)
      showMsg('Qabul qilindi!')
      onAccepted?.()
    } catch { /* */ }
  }

  // ── PDF YUKLAB OLISH ──────────────────────────────────────────────────────────

  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const dateStr = `${selectedDay}.${selectedMonth}.${selectedYear}`
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`DU-46 Jurnali - ${stationName}`, 14, 15)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Sana: ${dateStr}`, 14, 22)

    const headRows: any[] = [
      [
        { content: '№', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Oy va\nkun', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Soat va\ndaqiqa', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: "Ko'rik, tekshiruvlar tahlili,\ntopilgan kamchiliklar bayoni", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: "Tegishli xodimga\nxabar berilgan vaqt", colSpan: 3, styles: { halign: 'center' } },
        { content: "Tegishli xodimning nosozlik va buzilishlarni\nbartaraf etishga kelgan vaqti", colSpan: 3, styles: { halign: 'center' } },
        { content: "Aniqlangan nosozliklar va buzilishlarni bartaraf\nqilganligi vaqti va xodimning imzosi", colSpan: 3, styles: { halign: 'center' } }
      ],
      [
        { content: 'Oy/kun', styles: { halign: 'center' } },
        { content: 'Soat va daqiqa', styles: { halign: 'center' } },
        { content: 'Xabar berish\nusuli', styles: { halign: 'center' } },
        { content: 'Oy/kun', styles: { halign: 'center' } },
        { content: 'Soat va daqiqa', styles: { halign: 'center' } },
        { content: 'Bartaraf etishga kelgan\nxodimning imzosi', styles: { halign: 'center' } },
        { content: 'Oy/kun', styles: { halign: 'center' } },
        { content: 'Soat va daqiqa', styles: { halign: 'center' } },
        { content: 'Nosozliklar va buzilishlarning\ntafsiloti', styles: { halign: 'center' } }
      ]
    ]
    
    const tableRows = entries
      .filter(e => e.kamchilik || e.bartarafInfo || e.oyKun1 || e.soatMinut1)
      .map((e, i) => {
        let col3 = e.kamchilik || ''
        if (e.kamchilikBajarildi) col3 += `\n\nBoshladi: ${e.kamchilikImzo}`
        if (e.approvalsCol3?.length) e.approvalsCol3.forEach(a => { col3 += `\n${a.role.replace('_', ' ')}: ${a.signedBy}` })
        if (e.kamchilikBBTasdiqladi) col3 += `\nNavbatchi: ${e.kamchilikBBImzo}`

        let col12 = e.bartarafInfo || ''
        if (e.bartarafBajarildi) col12 += `\n\nTugadi: ${e.bartarafImzo}`
        if (e.approvalsCol12?.length) e.approvalsCol12.forEach(a => { col12 += `\n${a.role.replace('_', ' ')}: ${a.signedBy}` })
        if (e.bartarafBBTasdiqladi) col12 += `\nNavbatchi: ${e.bartarafBBImzo}`

        return [
          e.nomber || String(i + 1),
          e.oyKun1 || '', e.soatMinut1 || '', col3,
          e.oyKun2 || '', e.soatMinut2 || '', e.xabarUsuli || '',
          e.oyKun3 || '', e.soatMinut3 || '', e.dspImzo || '',
          e.oyKun4 || '', e.soatMinut4 || '', col12
        ]
      })

    autoTable(doc, {
      head: headRows, body: tableRows, startY: 28, theme: 'grid',
      styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' },
      margin: { left: 10, right: 10 },
      headStyles: { fillColor: [8, 23, 40], textColor: [255, 255, 255], fontSize: 5, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: { 
        0: { halign: 'center', cellWidth: 6 },
        1: { halign: 'center', cellWidth: 12 },
        2: { halign: 'center', cellWidth: 12 },
        // 3 is auto
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 12 },
        6: { halign: 'center', cellWidth: 15 },
        7: { halign: 'center', cellWidth: 12 },
        8: { halign: 'center', cellWidth: 12 },
        9: { halign: 'center', cellWidth: 18 },
        10: { halign: 'center', cellWidth: 12 },
        11: { halign: 'center', cellWidth: 12 },
        // 12 is auto
      },
    })

    doc.save(`DU-46_${stationName}_${dateStr.replace(/\./g, '-')}.pdf`)
  }

  // ── COMPUTED VALUES ───────────────────────────────────────────────────────────

  const hasAnyEntry = entries.some(e => e.kamchilik || e.bartarafInfo)
  // Dispetcherga yuborish uchun tayyor qatorlar (ikkala ustun ham tasdiqlangan, hali yuborilmagan)
  const tasdiqlanganCount = entries.filter(
    e => !e.yuborildi && (e.kamchilik || e.bartarafInfo) && isCol3Finished(e) && isCol12Finished(e)
  ).length
  const kutilayotganCount = entries.filter(e => e.yuborildi && !e.dispetcherQabulQildi).length

  // ── RENDER ────────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-300 font-bold uppercase tracking-widest">Yuklanmoqda...</div>

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50">
      {/* — Header ——————————————————————————————————————————————————————————————— */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-8 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">DU-46 Jurnali</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stationName} · {journalMonthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {!isCurrentMonth && !isDispatcher && (
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
              Faqat ko&apos;rish (o&apos;tgan oy)
            </span>
          )}
          {/* Bug #13 fix: xatolik xabarlari qizil, muvaffaqiyat xabarlari yashil */}
          {msg && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
              msg.toLowerCase().includes('xato') || msg.toLowerCase().includes('error')
                ? 'bg-red-50 text-red-600 border-red-100'
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>{msg}</span>
          )}
        </div>
      </div>

      {/* --- Content --- */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Orqaga */}
        <button onClick={onClose} className="mb-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]">
          <ChevronLeft size={18} />
          <span>Orqaga</span>
        </button>

        {/* Sana va Yuklab olish */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Sana:</span>
            <div className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200">
              {selectedDay}.{selectedMonth}.{selectedYear}
            </div>
          </div>
          <button onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
            <Download size={14} /> Yuklab olish
          </button>
        </div>

        {/* --- Jadval --- */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <table style={{ minWidth: '1400px' }} className="w-full border-collapse text-[11px] text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-tight text-slate-500 border-b-2 border-slate-200">
              <tr>
                <th rowSpan={2} className="w-[3%] border-r border-b border-slate-200 p-3 text-center">№</th>
                <th rowSpan={2} className="w-[5%] border-r border-b border-slate-200 p-3 text-center">Oy va<br />kun</th>
                <th rowSpan={2} className="w-[5%] border-r border-b border-slate-200 p-3 text-center">Soat va<br />daqiqa</th>
                <th rowSpan={2} className="w-[18%] border-r border-b border-slate-200 p-3 text-center">Ko&apos;rik, tekshiruvlar tahlili,<br />topilgan kamchiliklar bayoni</th>
                <th colSpan={3} className="border-r border-b border-slate-200 p-3 text-center bg-purple-50/30">Tegishli xodimga<br />xabar berilgan vaqt</th>
                <th colSpan={3} className="border-r border-b border-slate-200 p-3 text-center bg-purple-50/30">Tegishli xodimning nosozlik va buzilishlarni<br />bartaraf etishga kelgan vaqti</th>
                <th colSpan={3} className="border-b border-slate-200 p-3 text-center bg-amber-50/20">Aniqlangan nosozliklar va buzilishlarni bartaraf qilganligi vaqti<br />va xodimning imzosi</th>
              </tr>
              <tr className="bg-slate-100/50">
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Oy/kun</th>
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Soat va daqiqa</th>
                <th className="w-[7%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Xabar berish<br />usuli</th>
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Oy/kun</th>
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Soat va daqiqa</th>
                <th className="w-[7%] border-r border-b border-slate-200 p-3 text-center text-purple-600 font-black">Bartaraf etishga kelgan<br />xodimning imzosi</th>
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-amber-600 font-black">Oy/kun</th>
                <th className="w-[5%] border-r border-b border-slate-200 p-3 text-center text-amber-600 font-black">Soat va daqiqa</th>
                <th className="w-[15%] border-b border-slate-200 p-3 text-center text-amber-600 font-black">Nosozliklar va buzilishlarning tafsiloti</th>
              </tr>
              <tr className="bg-slate-50">
                {['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((n, i) => (
                  <th key={i} className="border-r border-b border-slate-200 p-2 text-center text-[9px] font-black text-slate-400 last:border-r-0 bg-slate-50">{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const iAmRoleCreator = isCreator(e)
                const isExactCreator = e.kamchilikImzo ? e.kamchilikImzo === userName : iAmRoleCreator
                const hasRightToFix = isExactCreator || (e.approvalChain && e.approvalChain.includes(userRole))

                const hasNoCreator = !e.createdByRole && !e.kamchilik && !e.oyKun1 && !e.soatMinut1
                const canWriteCol3 = isCurrentMonth && !isCol3Finished(e) && (iAmRoleCreator || hasNoCreator) && !isDispatcher

                // Bug #5 fix: o'tgan oylar uchun 12-ustun ham yopiq bo'lishi kerak
                const canWriteCol12 = isCurrentMonth && !isCol12Finished(e) && isCol3Finished(e) && !isDispatcher && hasRightToFix

                const canWriteMiddle = isCurrentMonth && !isDispatcher && !isCol12Finished(e) && (hasRightToFix || hasNoCreator)

                return (
                  <tr key={i} className="border-b border-slate-200 hover:bg-blue-50/50 transition-colors animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    {/* --- № --- */}
                    <td className="border-r border-slate-200 p-1 text-center bg-slate-50/30">
                      <LocalInput
                        value={e.nomber || ''}
                        onChange={(val: string) => update(i, 'nomber', val)}
                        readOnly={isDispatcher || !!e.yuborildi}
                        placeholder={String(i + 1)}
                        className="w-full rounded bg-transparent text-center font-black text-slate-400 outline-none focus:bg-white transition-all focus:text-purple-600"
                      />
                    </td>

                    {/* ── Ustun 1: Oy va kun ─────────────────── */}
                    <td className="border-r border-slate-200 p-0.5">
                      <DateInput
                        value={e.oyKun1 || ''}
                        onChange={val => update(i, 'oyKun1', val)}
                        readOnly={!canWriteCol3}
                      />
                    </td>

                    {/* — Ustun 2: Soat va daqiqa */}
                    <td className="border-r border-slate-200 p-0.5 align-top relative bg-purple-50/10">
                      <div className="pb-[150px]">
                        <TimeInput
                          value={e.soatMinut1 || ''}
                          onChange={val => update(i, 'soatMinut1', val)}
                          readOnly={!canWriteCol3}
                          className={e.kamchilikBajarildi ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-transparent focus:bg-white focus:shadow-inner'}
                        />
                      </div>

                      {e.kamchilik && e.kamchilikBajarildi && (
                        <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center justify-end">
                          {isCol3Finished(e) && e.kamchilikBBVaqt ? (
                            <div className="w-full rounded-xl bg-amber-100 px-2 py-2 text-center text-[10px] font-black text-amber-700 border border-amber-200 shadow-sm">
                              {e.kamchilikBBVaqt}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>

                    {/* — Ustun 3: Kamchilik bayoni */}
                    <td className="border-r border-slate-200 p-0.5 align-top relative min-w-[200px]">
                      <div className="pb-[150px]">
                        {isDispatcher ? (
                          <div className="w-full rounded px-3 py-2 text-[11px] font-medium text-slate-700 bg-white min-h-[60px]">
                            {e.kamchilik || <span className="text-slate-300">—</span>}
                          </div>
                        ) : (
                          <div className="relative group/text">
                            <LocalTextarea
                              value={e.kamchilik || ''}
                              onChange={(val: string) => update(i, 'kamchilik', val)}
                              readOnly={!canWriteCol3}
                              rows={3}
                              spellCheck={false}
                              lang="uz"
                              className="w-full resize-y rounded bg-transparent px-3 py-2 text-[11px] font-medium text-slate-700 outline-none transition-all focus:bg-white focus:shadow-inner"
                            />
                            {canWriteCol3 && (
                              <button onClick={() => setTaskModalIdx(i)} className="absolute top-1 right-1 p-1.5 rounded-lg bg-purple-50 text-purple-600 opacity-0 group-hover/text:opacity-100 transition-all hover:bg-purple-600 hover:text-white shadow-sm border border-purple-100">
                                <Plus size={10} strokeWidth={3} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* — Boshlandi / Tasdiqlash zanjiri tugmalari */}
                      <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1.5">
                        {/* 1) Boshlandi tugmasi (faqat yozuvchi ko'radi) */}
                        {e.kamchilik && iAmRoleCreator && !e.kamchilikBajarildi && !isMonthInPast(journalMonth) && (
                          <button
                            onClick={() => handleKamchilikBoshlandiClick(i)}
                            disabled={!e.oyKun1 || !e.soatMinut1}
                            className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${(!e.oyKun1 || !e.soatMinut1) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'btn-gradient'}`}
                          >
                            ▶ Boshlandi
                          </button>
                        )}

                        {e.kamchilikBajarildi && (
                          <div className="flex flex-col items-center gap-1 w-full relative group/edit">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Boshladi:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 w-full justify-center shadow-sm relative">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.kamchilikImzo}</span>
                            </div>
                            {isExactCreator && !isMonthInPast(journalMonth) && !isCol3Finished(e) && (
                              <button
                                onClick={() => setApprovalChainModal({ index: i, isEdit: true, currentChain: e.approvalChain || [] })}
                                className="absolute top-0 right-0 p-1 bg-white/80 rounded shadow-sm text-slate-400 hover:text-purple-600 border border-slate-200"
                                title="Tasdiqlash zanjirini tahrirlash"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        )}

                        {e.approvalsCol3?.map((appr, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{appr.role.replace('_', ' ')}:</span>
                            <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-600 border border-blue-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> 
                              <span className="truncate">{appr.signedBy}</span>
                            </div>
                          </div>
                        ))}

                        {e.kamchilikBBTasdiqladi && (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bekat navbatchisi:</span>
                            <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 border border-amber-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> 
                              <span className="truncate">{e.kamchilikBBImzo}</span>
                            </div>
                          </div>
                        )}

                        {canIApprove(e, 3) && !isMonthInPast(journalMonth) ? (() => {
                          const isFinal = isFinalApprover(e, 3)
                          const canConfirm = !isFinal || !!e.kamchilikBBVaqt
                          return (
                            <div className="flex flex-col gap-1 w-full mt-1">
                              {isFinal && (
                                <TimeInput
                                  value={e.kamchilikBBVaqt || ''}
                                  onChange={val => update(i, 'kamchilikBBVaqt', val)}
                                  readOnly={false}
                                  className="w-full bg-white shadow-sm border border-slate-200"
                                />
                              )}
                              <button
                                onClick={() => handleKamchilikTasdiqlash(i)}
                                disabled={!canConfirm}
                                className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${!canConfirm ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 border-transparent'}`}
                              >
                                Tasdiqlash
                              </button>
                            </div>
                          )
                        })() : (
                          // Tasdiqlash tugmasi yo'q bo'lsa, lekin u ushbu zanjirda qatnashayotgan bo'lsa
                          (!isMonthInPast(journalMonth) && e.approvalChain?.includes(userRole) && !(e.approvalsCol3 || []).some(a => a.role === userRole)) && (
                            <div className="w-full rounded-xl bg-orange-50 px-2 py-1.5 border border-orange-100 mt-1 flex flex-col items-center">
                              <span className="text-[8px] font-bold uppercase text-orange-400">Navbat kutilmoqda</span>
                              <span className="text-[9px] font-black text-orange-600 text-center leading-tight">
                                Avval {getWaitingForRole(e, 3)} tasdiqlashi kerak
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </td>

                    {/* — Ustunlar 4-9 (oraliq) */}
                    {(['oyKun2', 'soatMinut2', 'xabarUsuli', 'oyKun3', 'soatMinut3', 'dspImzo'] as (keyof DU46Entry)[]).map((field, fi) => (
                      <td key={fi} className="border-r border-slate-200 p-0.5 bg-purple-50/5">
                        {(field === 'oyKun2' || field === 'oyKun3') ? (
                          <DateInput
                            value={(e[field] as string) || ''}
                            onChange={val => update(i, field, val)}
                            readOnly={!canWriteMiddle}
                          />
                        ) : (field === 'soatMinut2' || field === 'soatMinut3') ? (
                          <TimeInput
                            value={(e[field] as string) || ''}
                            onChange={val => update(i, field, val)}
                            readOnly={!canWriteMiddle}
                            className="bg-transparent focus:bg-white focus:shadow-inner"
                          />
                        ) : (
                          <LocalInput
                            value={(e[field] as string) || ''}
                            onChange={(val: string) => update(i, field, val)}
                            readOnly={!canWriteMiddle}
                            className="w-full rounded bg-transparent px-1.5 py-3 text-center text-[11px] outline-none transition-all focus:bg-white focus:shadow-inner"
                          />
                        )}
                      </td>
                    ))}

                    {/* — Ustun 10: Oy/kun */}
                    <td className="border-r border-slate-200 p-0.5">
                      <DateInput
                        value={e.oyKun4 || ''}
                        onChange={val => update(i, 'oyKun4', val)}
                        readOnly={!canWriteCol12}
                      />
                    </td>

                    {/* — Ustun 11: Soat va daqiqa */}
                    <td className="border-r border-slate-200 p-0.5 align-top relative bg-amber-50/5">
                      <div className="pb-[150px]">
                        <TimeInput
                          value={e.soatMinut4 || ''}
                          onChange={val => update(i, 'soatMinut4', val)}
                          readOnly={!canWriteCol12}
                          className={e.bartarafBajarildi ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-transparent focus:bg-white focus:shadow-inner'}
                        />
                      </div>

                      {e.bartarafInfo && e.bartarafBajarildi && (
                        <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center justify-end">
                          {isCol12Finished(e) && e.bartarafBBVaqt ? (
                            <div className="w-full rounded-xl bg-amber-100 px-2 py-2 text-center text-[10px] font-black text-amber-700 border border-amber-200 shadow-sm">
                              {e.bartarafBBVaqt}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>

                    {/* — Ustun 12: Bartaraf tafsiloti */}
                    <td className="p-0.5 align-top relative bg-amber-50/5 min-w-[200px]">
                      <div className="pb-[150px]">
                        {isDispatcher ? (
                          <div className="w-full rounded px-3 py-2 text-[11px] font-medium text-slate-700 bg-white min-h-[60px]">
                            {e.bartarafInfo || <span className="text-slate-300">—</span>}
                          </div>
                        ) : (
                          <LocalTextarea
                            value={e.bartarafInfo || ''}
                            onChange={(val: string) => update(i, 'bartarafInfo', val)}
                            readOnly={!canWriteCol12}
                            rows={3}
                            spellCheck={false}
                            lang="uz"
                            className={`w-full resize-y rounded px-3 py-2 text-[11px] font-medium outline-none transition-all ${
                              !canWriteCol12 && !e.bartarafInfo
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : canWriteCol12
                                  ? 'bg-transparent focus:bg-white focus:shadow-inner text-slate-700'
                                  : 'bg-transparent text-slate-700 cursor-not-allowed'
                            }`}
                            placeholder={!isCol3Finished(e) ? '3-ustun tasdiqlanishi kerak...' : ''}
                          />
                        )}
                      </div>

                      {/* — Bajarildi / Tasdiqlash zanjiri tugmalari */}
                      <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1.5">
                        {e.bartarafInfo && hasRightToFix && !e.bartarafBajarildi && !isMonthInPast(journalMonth) && (
                          <button
                            onClick={() => handleBartarafBajarildiClick(i)}
                            disabled={!e.oyKun4 || !e.soatMinut4 || !e.kamchilikBajarildi}
                            className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${(!e.oyKun4 || !e.soatMinut4 || !e.kamchilikBajarildi) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'btn-gradient'}`}
                          >
                            Tugadi
                          </button>
                        )}

                        {e.bartarafBajarildi && (
                          <div className="flex flex-col items-center gap-1 w-full relative">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tugadi:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.bartarafImzo}</span>
                            </div>
                          </div>
                        )}

                        {e.approvalsCol12?.map((app, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1 w-full mt-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{app.role.replace('_', ' ')}:</span>
                            <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 border border-blue-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{app.signedBy}</span>
                            </div>
                          </div>
                        ))}

                        {e.bartarafBBTasdiqladi && (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bekat navbatchisi:</span>
                            <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 border border-amber-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> 
                              <span className="truncate">{e.bartarafBBImzo}</span>
                            </div>
                          </div>
                        )}

                        {canIApprove(e, 12) && !isMonthInPast(journalMonth) ? (() => {
                          const isFinal = isFinalApprover(e, 12)
                          const canConfirm = !isFinal || !!e.bartarafBBVaqt
                          return (
                            <div className="flex flex-col gap-1 w-full mt-1">
                              {isFinal && (
                                <TimeInput
                                  value={e.bartarafBBVaqt || ''}
                                  onChange={val => update(i, 'bartarafBBVaqt', val)}
                                  readOnly={false}
                                  className="w-full bg-white shadow-sm border border-slate-200"
                                />
                              )}
                              <button
                                onClick={() => handleBartarafTasdiqlash(i)}
                                disabled={!canConfirm}
                                className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${!canConfirm ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 border-transparent'}`}
                              >
                                Tasdiqlash
                              </button>
                            </div>
                          )
                        })() : (
                          // "Navbat kutilmoqda" — faqat: zanjirda qatnashuvchi, hali tasdiqlamagan, "Tugadi" bosmaganlar uchun
                          (() => {
                            const tugadiRole = e.bartarafByRole
                            const workerRoles = ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik']
                            const iAmTugadiUser = tugadiRole &&
                              (tugadiRole === userRole || (workerRoles.includes(tugadiRole) && isWorker))
                            const alreadyApproved = (e.approvalsCol12 || []).some(a => a.role === userRole)
                            const inChain = e.approvalChain?.includes(userRole)
                            if (
                              !isMonthInPast(journalMonth) &&
                              inChain &&
                              !alreadyApproved &&
                              !iAmTugadiUser
                            ) {
                              return (
                                <div className="w-full rounded-xl bg-orange-50 px-2 py-1.5 border border-orange-100 mt-1 flex flex-col items-center">
                                  <span className="text-[8px] font-bold uppercase text-orange-400">Navbat kutilmoqda</span>
                                  <span className="text-[9px] font-black text-orange-600 text-center leading-tight">
                                    Avval {getWaitingForRole(e, 12)} tasdiqlashi kerak
                                  </span>
                                </div>
                              )
                            }
                            return null
                          })()
                        )}
                        {/* 3) Telegramga yuborish */}
                        {e.bartarafInfo && !isCol3Finished(e) && (
                          <span className="text-[8px] font-black text-red-400 text-center leading-tight px-1 mt-1 uppercase tracking-tighter">
                            3-ustun oxirigacha tasdiqlanmagan
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ——— Qator qo'shish / o'chirish ————————————————— */}
        {isEditor && (() => {
          const last = entries[entries.length - 1]
          const lastHasData = last.kamchilik || last.bartarafInfo
          const canRemove = entries.length > 1 && !lastHasData && !isMonthInPast(journalMonth)
          return (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!isMonthInPast(journalMonth) && (
                <button onClick={addRow} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95">
                  <Plus size={14} strokeWidth={3} /> <span className="uppercase tracking-widest">Qator qo&apos;shish</span>
                </button>
              )}
              {!isMonthInPast(journalMonth) && (
                <button onClick={removeRow} disabled={!canRemove}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition-all shadow-sm active:scale-95 ${canRemove
                    ? 'border-slate-200 bg-white text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50'
                    : 'border-slate-100 bg-slate-50/50 text-slate-300 cursor-not-allowed'
                  }`}>
                  <Trash2 size={14} strokeWidth={3} /> <span className="uppercase tracking-widest">Qator o&apos;chirish</span>
                </button>
              )}

            </div>
          )
        })()}

      </div>

      {/* Vazifa tanlash modal */}
      {taskModalIdx !== null && (
        <TaskSelectModal
          onSelect={(text) => {
            update(taskModalIdx as number, 'kamchilik', text)
            setTaskModalIdx(null)
          }}
          onClose={() => setTaskModalIdx(null)}
        />
      )}

      {/* ═══ Tasdiqlash Zanjiri Modali ═══ */}
      {approvalChainModal !== null && (
        <ApprovalChainModal
          initialChain={approvalChainModal.currentChain}
          isEdit={approvalChainModal.isEdit}
          creatorRole={userRole}
          onCancel={() => setApprovalChainModal(null)}
          onSave={(chain) => handleSaveApprovalChain(approvalChainModal.index, chain)}
        />
      )}
    </div>
  )
}
