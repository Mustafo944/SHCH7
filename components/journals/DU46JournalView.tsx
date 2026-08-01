/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client'

import { useEffect, useState, useCallback, useMemo, useRef, startTransition } from 'react'
import { supabase } from '@/lib/supabase'
import { getJournal, upsertJournal } from '@/lib/supabase-db'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import type { DU46Entry } from '@/types'
import { Plus, Trash2, CheckCircle2, Download, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List, Loader2 } from 'lucide-react'
import { getCurrentJournalMonth, isMonthInPast, getJournalMonthLabel, trimTrailingEmpty, isFutureDate } from './helpers'
import { DateInput, TimeInput } from './JournalSelectModal'
import { ApprovalChainModal } from './ApprovalChainModal'
import { TaskSelectModal } from './TaskSelectModal'
import { MicButton } from './MicButton'
import { DU46JournalRow } from './DU46JournalRow'
import { getCreator, getNextApproverRole, DU46_WORKER_GROUP_ROLES } from '@/lib/journals/du46Approval'

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL COMPONENTS (PREVENT EXCESSIVE RE-RENDERS)
// ═══════════════════════════════════════════════════════════════════════════════





// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY ENTRY FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

const EMPTY_DU46 = (month?: string): DU46Entry => ({
  // Qator yaratilgan ZAHOTI barqaror _id beramiz (server kutmasdan) —
  // aks holda, tarmoq sekinligi/qayta bosish sabab bitta "Boshlandi" amali
  // ikki marta jo'natilsa, har safar serverda YANGI _id olib, bitta yozuv
  // o'rniga ikkita mustaqil (duplikat) qator paydo bo'lar edi.
  _id: crypto.randomUUID(),
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

// _isNew/_isEdited faqat shu sessiyada Kunlik filtrda qatorni ko'rsatib turish uchun ishlatiladigan
// vaqtinchalik UI bayroqlari — bazaga hech qachon yozilmasligi kerak, aks holda o'sha qator boshqa
// barcha foydalanuvchilarda, har doim, tanlangan kundan qat'i nazar ko'rinib qolaveradi.
function stripSessionFlags(e: DU46Entry): DU46Entry {
  if (!(e as any)._isNew && !(e as any)._isEdited) return e
  const copy: any = { ...e }
  delete copy._isNew
  delete copy._isEdited
  return copy
}

// Qator "amalda bo'sh"mi — bazaga yozishga arzimaydimi?
// oyKun1/soatMinut1/nomber HISOBGA OLINMAYDI: ular "Qator qo'shish" va
// taskContext'da avtomatik to'ldiriladi, qator esa hali haqiqiy ma'lumotsiz.
// Bunday qatorlar bazaga yozilsa, boshqa foydalanuvchilarda ham ko'rinib,
// "o'chirsam yana paydo bo'ladi" muammosini keltirib chiqarar edi.
function isEmptyDu46Row(e: DU46Entry): boolean {
  return (
    !e.kamchilik?.trim() && !e.bartarafInfo?.trim() &&
    !e.kamchilikBajarildi && !e.bartarafBajarildi &&
    !e.oyKun2 && !e.soatMinut2 && !e.xabarUsuli &&
    !e.oyKun3 && !e.soatMinut3 && !e.dspImzo &&
    !e.oyKun4 && !e.soatMinut4 &&
    !e.linkedReportId
  )
}

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
  taskContext,
}: {
  stationId: string
  stationName: string
  userName: string
  userRole: string
  journalMonth?: string
  onClose: () => void
  onAccepted?: (isDone?: boolean, isInProgress?: boolean) => void
  taskContext?: {
    reportId: string
    entryIndex: number
    taskType: 'haftalik' | 'yillik' | 'yangi' | 'kmo' | 'majburiy'
    taskText?: string
  }
}) {
  const [entries, setEntries] = useState<DU46Entry[]>([])
  const entriesRef = useRef(entries)
  useEffect(() => { entriesRef.current = entries }, [entries])
  const [allEntries, setAllEntries] = useState<DU46Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'kunlik' | 'jadval'>('kunlik')
  const [selectedDateFilter, setSelectedDateFilter] = useState<number>(new Date().getDate())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Tasdiqlash zanjirini tanlash modali
  const [approvalChainModal, setApprovalChainModal] = useState<{ index: number, isEdit: boolean, currentChain: string[] } | null>(null)
  // Standart vazifalar ro'yxatidan tanlash modali (3-ustun)
  const [taskModalIdx, setTaskModalIdx] = useState<number | null>(null)

  // Saqlash jarayonida ekanligini bildiruvchi state (poyga holatlari va qotishlarning oldini olish uchun)
  const [isSavingJournal, setIsSavingJournal] = useState(false)

  // Bugungi sana va tanlangan oy
  const today = new Date()
  const selectedDay = String(today.getDate()).padStart(2, '0')
  const [jYear, jMonth] = (journalMonth || '').split('-')
  const selectedYear = jYear || String(today.getFullYear())
  const selectedMonth = jMonth || String(today.getMonth() + 1).padStart(2, '0')
  const journalMonthLabel = getJournalMonthLabel(journalMonth)

  // Oydagi kunlar soni
  const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate()

  // ── Rollar ─────────────────────────────────────────────────────────────────────
  const isYulUstasi = userRole === 'yul_ustasi'
  const isEchXodimi = userRole === 'ech_xodimi'
  const isElektromexanik = ['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik'].includes(userRole)
  const isWorker = isElektromexanik || isYulUstasi
  const isBekatBoshlighi = userRole === 'bekat_boshlighi'
  const isBekatNavbatchisi = userRole === 'bekat_navbatchisi'
  const isBB = isBekatBoshlighi || isBekatNavbatchisi
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
        // Eski buzilgan yozuvlarda _isNew/_isEdited bazaga yozilib qolgan bo'lishi mumkin — yuklashda tozalaymiz
        let loadedAllEntries = (j.entries as DU46Entry[]).map(stripSessionFlags)

        // ── OYLAR RO'YXATI ──
        const OYLAR = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
        const getMonthName = (monthStr: string) => {
          if (!monthStr) return "O'tgan"
          const m = parseInt(monthStr.split('-')[1], 10)
          return !isNaN(m) && m >= 1 && m <= 12 ? OYLAR[m - 1] : "O'tgan"
        }

        // ── CARRY OVER LOGIC START ──
        let hasCarryOvers = false
        const carryOverRows: DU46Entry[] = []
        const remainingEntries: DU46Entry[] = []

        loadedAllEntries.forEach(e => {
          // Boshlangan lekin tugatilmagan va eski oydan bo'lgan qatorlarni aniqlash
          if (
            e.kamchilik?.trim() &&
            !e.bartarafBajarildi &&
            e.journalMonth &&
            e.journalMonth < journalMonth &&
            !e.carriedOverToMonth
          ) {
            // Duplikatsiyani oldini olish (agar qachondir xato saqlangan bo'lsa)
            const isAlreadyCarriedOver = loadedAllEntries.some(x => x.carriedOverFromId === e._id && x.journalMonth === journalMonth)

            if (!isAlreadyCarriedOver) {
              e.carriedOverToMonth = journalMonth
              hasCarryOvers = true

              const oldId = e._id || Math.random().toString(36).substr(2, 9)
              e._id = oldId // asliga yozamiz

              const monthName = getMonthName(e.journalMonth)
              const prefix = `[${monthName} oyidan yopilmaganligi sababli ko'chirildi]`
              const hasPrefixAlready = e.kamchilik.includes("oyidan yopilmaganligi sababli ko'chirildi]") || e.kamchilik.includes("[O'tgan oydan ko'chirildi]")
              const newKamchilik = hasPrefixAlready ? e.kamchilik : `${prefix}\n${e.kamchilik}`

              const newRow: DU46Entry = {
                ...e,
                _id: undefined, // Yangi id berilishi uchun
                journalMonth: journalMonth,
                carriedOverFromMonth: e.journalMonth,
                carriedOverFromId: oldId,
                kamchilik: newKamchilik
              }
              carryOverRows.push(newRow)
            }
          }
          remainingEntries.push(e)
        })

        if (hasCarryOvers) {
          // Ko'chirilgan qatorlarni ro'yxatning boshiga qo'shamiz
          loadedAllEntries = [...carryOverRows, ...remainingEntries]
          // Avtomatik orqaga saqlab qo'yamiz
          import('@/lib/supabase-db').then(db => {
            db.updateJournal(stationId, 'du46', loadedAllEntries, userName).catch(console.error)
          }).catch(console.error)
        }
        // ── CARRY OVER LOGIC END ──

        setAllEntries(loadedAllEntries)
        // Bug #11 fix: eski qatorlarda journalMonth bo'lmasligi mumkin (migratsiyadan oldin saqlangan).
        // Bunday qatorlarni joriy tanlangan oy uchun ko'rsatamiz (backward compatibility).
        const monthEntries = loadedAllEntries.filter(
          e => e.journalMonth === journalMonth || (!e.journalMonth && !loadedAllEntries.some(x => x.journalMonth))
        )

        if (monthEntries.length > 0) {
          setEntries(prev => {
            const merged = [...monthEntries]
            for (let i = 0; i < merged.length; i++) {
              const dbRow = merged[i]
              const localRow = prev[i]
              if (dbRow && localRow) {
                // Live (realtime) yangilanishlar barcha foydalanuvchilarda bir xil ko'rinishi uchun
                // doim ma'lumotlar bazasidan kelgan eng so'nggi holatni olamiz.
                // Lekin foydalanuvchi joriy sessiyada tahrirlayotgan/qo'shgan qatorlar Kunlik rejimda yo'qolib qolmasligi uchun UI bayroqlarni saqlaymiz:
                const newRow: any = { ...dbRow }
                newRow._isEdited = (localRow as any)._isEdited
                newRow._isNew = (localRow as any)._isNew
                merged[i] = newRow
              }
            }
            // Agar foydalanuvchi lokalda ko'proq qator qo'shgan bo'lsa, ularni saqlab qolamiz.
            // `_isNew` tekshiruvi ham SHART: aks holda "Qator qo'shish" bosilgach hali
            // matn kiritilmagan yangi (bo'sh) qator — saqlashdan keyingi realtime
            // yangilanish shu yerga kelib qolib, darhol yana o'chib ketardi.
            if (prev.length > merged.length) {
              for (let i = merged.length; i < prev.length; i++) {
                const localRow = prev[i];
                if (localRow.kamchilik || localRow.bartarafInfo || (localRow as any)._isNew || (localRow as any)._isEdited) {
                  merged.push(localRow);
                }
              }
            }
            return merged
          })
        } else {
          setEntries(prev => {
            const hasLocalEdits = prev.some(p => p.kamchilik || p.oyKun1 || p.bartarafInfo)
            if (hasLocalEdits && prev.length > 0) return prev
            return []
          })
        }
      } else {
        setAllEntries([])
        setEntries(prev => {
          const hasLocalEdits = prev.some(p => p.kamchilik || p.oyKun1 || p.bartarafInfo)
          if (hasLocalEdits && prev.length > 0) return prev
          return []
        })
      }
    } catch (err) {
      console.error('Journal yuklash xatosi:', err)
    } finally {
      if (!isSilent) {
        setTimeout(() => setLoading(false), 50)
      }
    }
  }, [stationId, journalMonth])

  useEffect(() => {
    loadJournalData(false)
  }, [loadJournalData])

  // ── Auto-populate row based on taskContext ──
  useEffect(() => {
    if (!loading && taskContext && entries.length > 0) {
      // Check if we already have a row linked to this task
      const alreadyLinked = entries.some(
        e => e.linkedReportId === taskContext.reportId && e.linkedTaskType === taskContext.taskType
      )
      if (!alreadyLinked && taskContext.taskText) {
        // Find first empty row (or create new if all are full)
        const emptyIndex = entries.findIndex(e => !e.kamchilik && !e.oyKun1 && !e.soatMinut1 && !e.bartarafInfo && !e.kamchilikBajarildi)

        const todayStr = `${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date().getFullYear()}`
        const timeStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`

        setEntries(prev => {
          const n = [...prev]
          if (emptyIndex !== -1) {
            n[emptyIndex] = {
              ...n[emptyIndex],
              nomber: n[emptyIndex].nomber || getNextNomber(n),
              oyKun1: todayStr,
              soatMinut1: timeStr,
              linkedReportId: taskContext.reportId,
              linkedEntryIndex: taskContext.entryIndex,
              linkedTaskType: taskContext.taskType,
              createdByRole: userRole as any
            }
          } else {
            // Append a new row if no empty rows
            const newRow = EMPTY_DU46(journalMonth)
            newRow.nomber = getNextNomber(n)
            newRow.oyKun1 = todayStr
            newRow.soatMinut1 = timeStr
            newRow.linkedReportId = taskContext.reportId
            newRow.linkedEntryIndex = taskContext.entryIndex
            newRow.linkedTaskType = taskContext.taskType
            newRow.createdByRole = userRole as any
            n.push(newRow)
          }
          return n
        })

        showMsg("Sana va vaqt avtomatik kiritildi — ish mazmunini o'zingiz yozing", 3000)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, taskContext, entries.length])

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

  /** Joriy foydalanuvchi qatorni yaratgani (yozuvchi)mi?
   * Bug #4 fix: bekat_navbatchisi faqat tasdiqlovchi — creator emas.
   * Creator aniqlash uchun userRole ni to'g'ridan-to'g'ri tekshiramiz.
   */
  const isCreator = (e: DU46Entry): boolean => {
    const creator = getCreator(e)
    if (creator === 'yul_ustasi') return isYulUstasi
    if (creator === 'ech_xodimi') return isEchXodimi
    // Bekat boshlig'i va bekat navbatchisi alohida rollar — creator faqat o'zi
    if (creator === 'bekat_boshlighi') return isBekatBoshlighi
    if (creator === 'bekat_navbatchisi') return isBekatNavbatchisi
    if (['worker', 'elektromexanik', 'elektromontyor', 'katta_elektromexanik'].includes(creator)) return isWorker
    return creator === 'worker' && isWorker
  }

  // getNextApproverRole endi lib/journals/du46Approval.ts dan import qilinadi —
  // bosh sahifadagi "kutilmoqda" hisobi (getPendingJournalCounts) bilan bir xil
  // manbadan foydalanish uchun (ilgari ikkalasi mustaqil yozilgan va farqlanib ketgan edi).

  const isFinalApprover = useCallback((e: DU46Entry, col: 3 | 12): boolean => {
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
  }, [getCreator])

  const isCol3Finished = useCallback((e: DU46Entry): boolean => {
    if (e.kamchilikBBTasdiqladi) return true
    const nextRole = getNextApproverRole(e, 3)
    if (e.kamchilikBajarildi && nextRole === null) return true
    return false
  }, [])

  const isCol12Finished = useCallback((e: DU46Entry): boolean => {
    if (e.bartarafBBTasdiqladi) return true
    const nextRole = getNextApproverRole(e, 12)
    if (e.bartarafBajarildi && nextRole === null) return true
    return false
  }, [])

  const canIApprove = useCallback((e: DU46Entry, col: 3 | 12): boolean => {
    const nextRole = getNextApproverRole(e, col)
    if (!nextRole) return false
    // DSP = faqat bekat navbatchisi tasdiqlaydi (bekat boshlig'i emas)
    if (nextRole === 'DSP') return isBekatNavbatchisi
    // Xavfsizlik: 12-ustunda "Tugadi" bosgan odam hech qachon tasdiqlay olmaydi (ism bo'yicha tekshiramiz)
    if (col === 12 && e.bartarafImzo === userName) return false
    if (nextRole === 'worker') return isWorker
    return userRole === nextRole
  }, [isBekatNavbatchisi, userName, isWorker, userRole])

  // Hozir kim tasdiqlashi kerakligini aniqlaydigan yordamchi.
  //
  // HOZIRDA ISHLATILMAYDI: u faqat "Navbat kutilmoqda — avval X tasdiqlashi
  // kerak" yorlig'ini chizish uchun kerak edi, o'sha yorliq esa foydalanuvchi
  // so'roviga ko'ra 2026-07-31 da olib tashlandi. Funksiya ataylab qoldirildi —
  // yorliqni qaytarish kerak bo'lsa (3- va 12-ustunlardagi `null` o'rniga)
  // shunchaki qayta chaqiriladi. Navbat MANTIG'I bundan mustaqil ishlaydi
  // (`isMyTurnToApprove` / `getNextApproverRole`), shuning uchun bu funksiyani
  // o'chirish ham, qoldirish ham xatti-harakatga ta'sir qilmaydi.
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
  const update = useCallback((i: number, field: keyof DU46Entry, val: string) => {
    const n = [...entriesRef.current]
    n[i] = { ...n[i], [field]: val }

      // Foydalanuvchi tahrirlayotgan qator Kunlik rejimda sana o'zgargani uchun g'oyib bo'lmasligi uchun belgi qo'yamiz
      ; (n[i] as any)._isEdited = true;

    // Bug #17 fix: createdByRole ni istalgan maydon o'zgarganda belgilaymiz (faqat 3 ta maydon emas)
    if (!n[i].createdByRole) {
      if (isYulUstasi) n[i].createdByRole = 'yul_ustasi'
      else if (isEchXodimi) n[i].createdByRole = 'ech_xodimi'
      else if (isElektromexanik) n[i].createdByRole = 'worker'
      else if (isBekatNavbatchisi) n[i].createdByRole = 'bekat_navbatchisi'
      else if (isBekatBoshlighi) n[i].createdByRole = 'bekat_boshlighi'
    }

    // Heavy render from large list is deferred to keep typing smooth
    startTransition(() => {
      setEntries(n)
    })
  }, [isYulUstasi, isEchXodimi, isElektromexanik, isBekatNavbatchisi, isBekatBoshlighi])

  // ── Qator boshqaruvi ─────────────────────────────────────────────────────────
  // Bug #16 fix: yangi qatorlarga journalMonth ni uzatamiz
  // Berilgan (hozirgi eng so'nggi) ro'yxat asosida keyingi "№" raqamini
  // hisoblaydi — DB'dagi (allEntries) VA shu ro'yxatdagi eng katta raqamdan
  // kelib chiqadi.
  // MUHIM: bu funksiya HAR DOIM `setEntries(prev => ...)` ICHIDA, `prev`
  // argumenti bilan chaqirilishi kerak — tashqi `entries` o'zgaruvchisidan
  // emas. Aks holda: "Qator qo'shish" tez-tez (ketma-ket) bosilsa, React
  // hali qayta render qilib ulgurmasdan ikkinchi bosish ham ESKIRGAN
  // `entries`ni ko'radi (birinchi bosishda qo'shilgan qatorni "ko'rmaydi"),
  // natijada ikkinchi qatorga birinchisidan KATTA emas, KICHIK raqam
  // (masalan 2 dan keyin yana 1) berilib qolar edi.
  const getNextNomber = (localEntries: DU46Entry[]): string => {
    // Jadvalda "№" ustuni `nomber` bo'sh bo'lsa qator pozitsiyasini (i+1)
    // placeholder sifatida ko'rsatadi. Shuning uchun keyingi raqamni ham xuddi
    // shu "amalda ko'rinadigan" raqamdan hisoblaymiz — aks holda `nomber`i
    // bazada bo'sh saqlangan qatorlar 0 deb olinib, yangi qatorga ekranda
    // allaqachon band bo'lgan raqam (masalan yana "1") berilib qolar edi.
    const effectiveMax = (list: DU46Entry[]) =>
      list.reduce((max, x, i) => Math.max(max, parseInt(x.nomber || '') || (i + 1)), 0)
    // allEntries BARCHA oylarni saqlaydi, raqamlash esa har oy 1 dan boshlanadi
    // (jadval ham oy bo'yicha filtrlangan ro'yxatni ko'rsatadi) — shuning uchun
    // faqat joriy oy qatorlarini olamiz (loadJournalData'dagi filtr bilan bir xil).
    const monthDbEntries = allEntries.filter(
      e => e.journalMonth === journalMonth || (!e.journalMonth && !allEntries.some(x => x.journalMonth))
    )
    return String(Math.max(effectiveMax(monthDbEntries), effectiveMax(localEntries)) + 1)
  }

  const addRow = () => {
    if (isCurrentMonth) {
      const selDayStr = String(viewMode === 'kunlik' ? selectedDateFilter : today.getDate()).padStart(2, '0');
      const oyKun1 = `${selDayStr}-${selectedMonth}-${selectedYear}`;

      // Kim qo'shganini darhol belgilaymiz
      let createdByRole: DU46Entry['createdByRole'] | undefined;
      if (isYulUstasi) createdByRole = 'yul_ustasi';
      else if (isEchXodimi) createdByRole = 'ech_xodimi';
      else if (isElektromexanik) createdByRole = 'worker';
      else if (isBekatNavbatchisi) createdByRole = 'bekat_navbatchisi';
      else if (isBekatBoshlighi) createdByRole = 'bekat_boshlighi';

      startTransition(() => {
        setEntries(prev => {
          const newEntry = EMPTY_DU46(journalMonth);
          newEntry.oyKun1 = oyKun1;
          newEntry.nomber = getNextNomber(prev);
          if (createdByRole) newEntry.createdByRole = createdByRole;
          // Yangi qo'shilgan qator qaysi sana yozilishidan qat'i nazar shu sessiyada ko'rinib turishi uchun
          (newEntry as any)._isNew = true;
          return [...prev, newEntry];
        });
      })
    }
  }

  const findLastVisibleIndex = (): number => {
    if (viewMode === 'jadval') return entries.length - 1
    const selDayStr = String(selectedDateFilter).padStart(2, '0')
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i] as any
      if (e._isNew || e._isEdited) return i
      const val = (e.oyKun1 || '').trim()
      const valDay = val.split('-')[0].split('.')[0]
      if (valDay === selDayStr) return i
    }
    return -1
  }

  const removeRow = () => {
    const idx = findLastVisibleIndex()
    if (idx === -1) {
      showMsg("Bu kunda o'chiriladigan qator yo'q", 3000)
      return
    }
    const target = entries[idx]

    if (target.kamchilikBajarildi) {
      showMsg("Boshlandi bosilgan qatorni o'chirib bo'lmaydi", 3000)
      return
    }

    const hasTime = !!target.soatMinut1?.trim()
    const hasTask = !!target.kamchilik?.trim()
    if (hasTime || hasTask) {
      showMsg("Soat yoki ish kiritilgan qatorni o'chirib bo'lmaydi", 3000)
      return
    }

    const newEntries = [...entries.slice(0, idx), ...entries.slice(idx + 1)]
    saveEntries(newEntries, entries, { deletedIndex: idx })
  }

  const allEntriesRef = useCallback(() => allEntries, [allEntries])

  const saveEntries = useCallback(async (updated: DU46Entry[], prev: DU46Entry[], options?: { deletedIndex?: number }) => {
    setIsSavingJournal(true)
    setEntries(updated)
    const prevAllEntries = allEntriesRef()

    try {
      const latestJournal = await getJournal(stationId, 'du46')
      const latestAllEntries = (latestJournal?.entries as DU46Entry[]) || []

      const hasAnyMonthTag = latestAllEntries.some(x => x.journalMonth)
      const isCurrentMonthRow = (e: DU46Entry) =>
        e.journalMonth === journalMonth || (!e.journalMonth && !hasAnyMonthTag)
      const dbMonthEntries = latestAllEntries.filter(isCurrentMonthRow)

      if (options?.deletedIndex !== undefined && options.deletedIndex < dbMonthEntries.length) {
        dbMonthEntries.splice(options.deletedIndex, 1)
      }

      const mergedMonthEntries = [...updated]
      for (let i = 0; i < Math.max(mergedMonthEntries.length, dbMonthEntries.length); i++) {
        const local = mergedMonthEntries[i]
        const db = dbMonthEntries[i]

        if (!local && db) {
          mergedMonthEntries.push(db)
        } else if (local && db) {
          const mergeApprovals = (
            localList: typeof local.approvalsCol3,
            dbList: typeof db.approvalsCol3
          ) => {
            if (!dbList || dbList.length === 0) return localList || []
            if (!localList || localList.length === 0) return dbList
            return dbList.length >= localList.length ? dbList : localList
          }

          let merged = { ...local }

          if (!local.kamchilikBajarildi && db.kamchilikBajarildi) {
            merged = { ...merged, kamchilikBajarildi: db.kamchilikBajarildi, kamchilikBajarildiAt: db.kamchilikBajarildiAt, kamchilikImzo: db.kamchilikImzo, createdByRole: db.createdByRole }
            if (!local.oyKun1 && db.oyKun1) merged.oyKun1 = db.oyKun1
            if (!local.soatMinut1 && db.soatMinut1) merged.soatMinut1 = db.soatMinut1
            if (!local.kamchilik && db.kamchilik) merged.kamchilik = db.kamchilik
          }
          if (!local.bartarafBajarildi && db.bartarafBajarildi) {
            merged = { ...merged, bartarafBajarildi: db.bartarafBajarildi, bartarafBajarildiAt: db.bartarafBajarildiAt, bartarafImzo: db.bartarafImzo, bartarafByRole: db.bartarafByRole }
            if (!local.oyKun4 && db.oyKun4) merged.oyKun4 = db.oyKun4
            if (!local.soatMinut4 && db.soatMinut4) merged.soatMinut4 = db.soatMinut4
            if (!local.bartarafInfo && db.bartarafInfo) merged.bartarafInfo = db.bartarafInfo
          }
          if (!local.kamchilikBBTasdiqladi && db.kamchilikBBTasdiqladi) {
            merged = { ...merged, kamchilikBBTasdiqladi: db.kamchilikBBTasdiqladi, kamchilikBBTasdiqladiAt: db.kamchilikBBTasdiqladiAt, kamchilikBBImzo: db.kamchilikBBImzo, kamchilikBBVaqt: db.kamchilikBBVaqt }
          }
          if (!local.bartarafBBTasdiqladi && db.bartarafBBTasdiqladi) {
            merged = { ...merged, bartarafBBTasdiqladi: db.bartarafBBTasdiqladi, bartarafBBTasdiqladiAt: db.bartarafBBTasdiqladiAt, bartarafBBImzo: db.bartarafBBImzo, bartarafBBVaqt: db.bartarafBBVaqt }
          }

          const otherFields: (keyof DU46Entry)[] = ['oyKun2', 'soatMinut2', 'xabarUsuli', 'oyKun3', 'soatMinut3', 'dspImzo', 'nomber']
          otherFields.forEach(field => {
            if (!local[field] && db[field]) {
              merged[field] = db[field] as never
            }
          })

          merged = {
            ...merged,
            approvalsCol3: mergeApprovals(local.approvalsCol3, db.approvalsCol3),
            approvalsCol12: mergeApprovals(local.approvalsCol12, db.approvalsCol12),
          }

          mergedMonthEntries[i] = merged
        }
      }

      const otherMonths = latestAllEntries.filter(e => !isCurrentMonthRow(e))
      const mergedWithMonth = trimTrailingEmpty(mergedMonthEntries, isEmptyDu46Row)
        .map(e => ({ ...e, journalMonth }))

      // ── CARRY OVER SYNC LOGIC ──
      // Zanjirli yopish: barcha o'tgan oylardagi nusxalarini (agar bir necha oyga o'tgan bo'lsa) ham topib yangilaymiz.
      mergedWithMonth.forEach(currentEntry => {
        let targetId = currentEntry.carriedOverFromId
        while (targetId) {
          const originalIndex = otherMonths.findIndex(x => x._id === targetId)
          if (originalIndex !== -1) {
            const original = otherMonths[originalIndex]
            otherMonths[originalIndex] = {
              ...original,
              // O'ng tomon (7-12 ustunlar) va yopilish bayroqlarini arxivga ham yozamiz
              oyKun2: currentEntry.oyKun2 || original.oyKun2,
              soatMinut2: currentEntry.soatMinut2 || original.soatMinut2,
              xabarUsuli: currentEntry.xabarUsuli || original.xabarUsuli,
              oyKun3: currentEntry.oyKun3 || original.oyKun3,
              soatMinut3: currentEntry.soatMinut3 || original.soatMinut3,
              dspImzo: currentEntry.dspImzo || original.dspImzo,
              oyKun4: currentEntry.oyKun4 || original.oyKun4,
              soatMinut4: currentEntry.soatMinut4 || original.soatMinut4,
              bartarafInfo: currentEntry.bartarafInfo || original.bartarafInfo,
              bartarafBajarildi: currentEntry.bartarafBajarildi || original.bartarafBajarildi,
              bartarafBajarildiAt: currentEntry.bartarafBajarildiAt || original.bartarafBajarildiAt,
              bartarafImzo: currentEntry.bartarafImzo || original.bartarafImzo,
              bartarafByRole: currentEntry.bartarafByRole || original.bartarafByRole,
              bartarafNeedsEM: currentEntry.bartarafNeedsEM !== undefined ? currentEntry.bartarafNeedsEM : original.bartarafNeedsEM,
              bartarafEMTasdiqladi: currentEntry.bartarafEMTasdiqladi !== undefined ? currentEntry.bartarafEMTasdiqladi : original.bartarafEMTasdiqladi,
              bartarafEMTasdiqladiAt: currentEntry.bartarafEMTasdiqladiAt || original.bartarafEMTasdiqladiAt,
              bartarafEMImzo: currentEntry.bartarafEMImzo || original.bartarafEMImzo,
              bartarafBBTasdiqladi: currentEntry.bartarafBBTasdiqladi !== undefined ? currentEntry.bartarafBBTasdiqladi : original.bartarafBBTasdiqladi,
              bartarafBBTasdiqladiAt: currentEntry.bartarafBBTasdiqladiAt || original.bartarafBBTasdiqladiAt,
              bartarafBBImzo: currentEntry.bartarafBBImzo || original.bartarafBBImzo,
              bartarafBBVaqt: currentEntry.bartarafBBVaqt || original.bartarafBBVaqt,
              approvalsCol12: currentEntry.approvalsCol12 || original.approvalsCol12,
            }
            targetId = original.carriedOverFromId // Zanjirni orqaga davom ettirish
          } else {
            targetId = undefined
          }
        }
      })
      // ── CARRY OVER SYNC LOGIC END ──

      let newAllEntries = [...otherMonths, ...mergedWithMonth]

      if (options?.deletedIndex !== undefined) {
        setAllEntries(newAllEntries)
      }

      if (newAllEntries.length === 0) {
        newAllEntries = [EMPTY_DU46(journalMonth)]
      }

      setAllEntries(newAllEntries)
      setEntries(mergedMonthEntries)

      // _isNew/_isEdited faqat shu sessiya uchun — bazaga hech qachon yozilmasligi kerak
      await upsertJournal(stationId, 'du46', newAllEntries.map(stripSessionFlags), userName)
    } catch (err) {
      // Bug #6 fix: snapshot'dan to'g'ri rollback
      console.error('Saqlash xatosi:', err)
      setEntries(prev)
      setAllEntries(prevAllEntries)
      showMsg(err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi', 3000)
      throw err
    } finally {
      setIsSavingJournal(false)
    }
  }, [allEntriesRef, stationId, journalMonth, userName])

  // ══════════════════════════════════════════════════════════════════════════════
  // USTUN 3: BOSHLANDI + TASDIQLASH
  // ══════════════════════════════════════════════════════════════════════════════

  const handleKamchilikBoshlandiClick = useCallback((i: number) => {
    const e = entriesRef.current[i]
    if (!e.oyKun1 || !e.soatMinut1 || !e.kamchilik?.trim()) {
      showMsg("1, 2 va 3-ustunlarni to'ldiring!")
      return
    }
    setApprovalChainModal({ index: i, isEdit: false, currentChain: [] })
  }, [])

  const handleSaveApprovalChain = useCallback(async (idx: number, chain: string[]) => {
    const currentEntries = entriesRef.current
    const prev = [...currentEntries]
    const updated = [...currentEntries]
    const e = updated[idx]
    const isEdit = approvalChainModal?.isEdit

    if (isEdit) {
      updated[idx] = { ...e, approvalChain: chain }
    } else {
      updated[idx] = {
        ...e,
        kamchilikBajarildi: true,
        kamchilikBajarildiAt: new Date().toISOString(),
        kamchilikImzo: userName,
        approvalChain: chain,
        approvalsCol3: [],
        approvalsCol12: [],
        linkedReportId: e.linkedReportId || taskContext?.reportId,
        linkedTaskType: e.linkedTaskType || taskContext?.taskType,
        linkedEntryIndex: e.linkedEntryIndex ?? taskContext?.entryIndex,
      }
    }

    // Modal DARHOL yopiladi — foydalanuvchi saqlash tugashini kutib turmaydi.
    // Bu xavfsiz, chunki `saveEntries` xato bo'lsa O'ZI hamma narsani orqaga
    // qaytaradi (`setEntries(prev)` + `setAllEntries(prevAllEntries)`) va xato
    // xabarini `showMsg` bilan ko'rsatadi. Ilgari ham modal xato holatida
    // `catch` ichida yopilardi, ya'ni u HAR QANDAY holatda yopilgan — farqi
    // faqat foydalanuvchi 3-4 soniya kutib turishida edi.
    setApprovalChainModal(null)

    try {
      // MUHIM: `onAccepted()` va `updateReportEntryInProgress()` HAMON saqlash
      // tasdiqlangandan KEYIN chaqiriladi — aks holda saqlash xato bilan tugasa,
      // tashqi tomon (ish rejasidagi vazifa) allaqachon "jarayonda/bajarildi"
      // deb belgilanib qolar edi.
      await saveEntries(updated, prev)

      showMsg(isEdit ? 'Tasdiqlash zanjiri yangilandi!' : 'Boshlandi belgilandi!')

      // taskContext bo'lsa, uni Jarayonda (In Progress) ga o'tkazamiz
      const activeReportId = e.linkedReportId || taskContext?.reportId;
      const activeTaskType = e.linkedTaskType || taskContext?.taskType;
      const activeEntryIndex = e.linkedEntryIndex ?? taskContext?.entryIndex;

      if (!isEdit && activeReportId && activeTaskType && activeEntryIndex !== undefined) {
        import('@/lib/supabase-db').then(db => {
          db.updateReportEntryInProgress(activeReportId, activeEntryIndex, activeTaskType)
        }).catch(err => console.error("In progress error:", err))
        onAccepted?.(false, true)
      } else if (!isEdit) {
        onAccepted?.(true, false)
      }
    } catch {
      // Bu yerda qo'shimcha ish YO'Q va bu ataylab:
      //   • modal yuqorida allaqachon yopilgan;
      //   • `saveEntries` holatni `prev` ga qaytargan va xato xabarini
      //     `showMsg` orqali ko'rsatgan.
      // `catch` faqat qayta otilgan xatoni ushlab qolish uchun turibdi
      // (aks holda u "unhandled rejection" bo'lib chiqar edi).
    }
  }, [userName, saveEntries, approvalChainModal, taskContext, onAccepted])

  const handleKamchilikTasdiqlash = async (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    // Bug #1 fix: e ni joriy entries state'dan olamiz (stale closure muammosidan himoya)
    const e = entries[i]

    if (!e.oyKun1 || !e.soatMinut1 || !e.kamchilik?.trim()) {
      showMsg("1, 2 va 3-ustunlar to'ldirilmagan!")
      return
    }

    const nextRole = getNextApproverRole(e, 3)

    if (isBekatNavbatchisi) {
      // Faqat bekat navbatchisi tasdiqlaydi (bekat boshlig'i emas)
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

  const handleBartarafBajarildiClick = useCallback(async (i: number) => {
    const currentEntries = entriesRef.current
    const prev = [...currentEntries]
    const updated = [...currentEntries]
    const e = updated[i]
    if (!e.oyKun4 || !e.soatMinut4 || !e.bartarafInfo?.trim()) {
      showMsg("10, 11 va 12-ustunlarni to'ldiring!")
      return
    }
    const updatedEntry = {
      ...updated[i],
      bartarafBajarildi: true,
      bartarafBajarildiAt: new Date().toISOString(),
      bartarafImzo: userName,
      bartarafByRole: userRole,
    }
    updated[i] = updatedEntry

    try {
      // MUHIM: bazaga saqlash tasdiqlanmaguncha onAccepted() chaqirilmaydi —
      // aks holda saqlash tarmoq xatosi bilan tugasa, oylik ish rejasidagi
      // vazifa allaqachon "bajarildi" deb belgilanib, jurnal oynasi yopilib
      // ulguradi va foydalanuvchi xatoni ko'rmay qoladi.
      await saveEntries(updated, prev)
      showMsg('Bajarildi belgilandi!')

      // "Tugadi" bosilishi oylik ish reja checklisti uchun yetarli hisoblanadi —
      // DU-46ning o'z ichidagi tasdiqlash zanjiri (bekat navbatchisigacha) mustaqil davom etadi,
      // lekin oylik vazifani endi bloklamaydi.
      if (onAccepted) onAccepted(true, false)

      const activeReportId = updatedEntry.linkedReportId || taskContext?.reportId
      const activeTaskType = updatedEntry.linkedTaskType || taskContext?.taskType
      const activeEntryIndex = updatedEntry.linkedEntryIndex ?? taskContext?.entryIndex
      if (activeReportId && activeTaskType && activeEntryIndex !== undefined) {
        import('@/lib/supabase-db').then(db => {
          db.updateReportEntryInProgress(activeReportId, activeEntryIndex, activeTaskType, false)
        }).catch(err => console.error("In progress clear error:", err))
      }
    } catch { /* saveEntries ichida xato xabari ko'rsatiladi */ }
  }, [userName, userRole, saveEntries, taskContext, onAccepted])

  const handleBartarafTasdiqlash = useCallback(async (i: number) => {
    const currentEntries = entriesRef.current
    const prev = [...currentEntries]
    const updated = [...currentEntries]
    // Bug #2 fix: e ni joriy entries state'dan olamiz
    const e = currentEntries[i]

    if (!e.oyKun4 || !e.soatMinut4 || !e.bartarafInfo?.trim()) {
      showMsg("10, 11 va 12-ustunlar to'ldirilmagan!")
      return
    }

    const nextRole = getNextApproverRole(e, 12)

    if (isBekatNavbatchisi) {
      // Faqat bekat navbatchisi tasdiqlaydi (bekat boshlig'i emas)
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

      // Agar bekat navbatchisi 12-ustunni tasdiqlasa, task ni "Bajarildi" qilamiz
      if (isBekatNavbatchisi && e.linkedReportId && e.linkedTaskType) {
        import('@/lib/supabase-db').then(db => {
          db.markReportEntryDoneFromJournal(e.linkedReportId!, e.linkedEntryIndex!, e.linkedTaskType!, userName)
        }).catch(err => console.error("Mark done error:", err))
      }
      // Agar "Bajarildi" bosilsa (Tugadi emas, tasdiqlansa) onAccepted() chaqirilmaydi, chunki user modalni o'zi yopadi.
    } catch { /* */ }
  }, [userName, isBekatNavbatchisi, saveEntries])

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

  const clearSessionFlags = () => {
    setEntries(prev => prev.map(e => {
      if ((e as any)._isNew || (e as any)._isEdited) {
        const copy = { ...e }
        delete (copy as any)._isNew
        delete (copy as any)._isEdited
        return copy
      }
      return e
    }))
  }

  const changeViewMode = (mode: 'kunlik' | 'jadval') => {
    setViewMode(mode)
    clearSessionFlags()
  }

  const changeDateFilter = (updater: (prev: number) => number) => {
    setSelectedDateFilter(updater)
    clearSessionFlags()
  }

  // ── RENDER ────────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-300 font-bold uppercase tracking-widest">Yuklanmoqda...</div>

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50">
      {/* — Header ——————————————————————————————————————————————————————————————— */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-8 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Orqaga */}
          <button onClick={onClose} className="flex items-center justify-center rounded-xl bg-white p-2 text-slate-600 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">DU-46 Jurnali</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stationName} · {journalMonthLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isCurrentMonth && !isDispatcher && (
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
              Faqat ko&apos;rish (o&apos;tgan oy)
            </span>
          )}
          {msg && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${msg.toLowerCase().includes('xato') || msg.toLowerCase().includes('error')
              ? 'bg-red-50 text-red-600 border-red-100'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>{msg}</span>
          )}
        </div>
      </div>

      {/* --- Content --- */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">

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

        {/* ── KUNLIK / JADVAL ────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-100/50 p-1.5 shadow-inner border border-slate-200/60 self-start">
            <button
              onClick={() => changeViewMode('kunlik')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'kunlik' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'text-slate-400 hover:text-slate-700 hover:bg-white/50'}`}
            >
              <LayoutGrid size={14} /> Kunlik
            </button>
            <button
              onClick={() => changeViewMode('jadval')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'jadval' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'text-slate-400 hover:text-slate-700 hover:bg-white/50'}`}
            >
              <List size={14} /> To&apos;liq jadval
            </button>
          </div>

          {viewMode === 'kunlik' && (
            <div className="flex justify-center w-full pb-2">
              <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
                <button
                  onClick={() => changeDateFilter(p => Math.max(1, p - 1))}
                  disabled={selectedDateFilter <= 1}
                  className="p-2 rounded-xl text-slate-400 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-purple-50/50 hover:bg-purple-100 transition-colors"
                  >
                    <Calendar size={16} className="text-purple-500" />
                    <span className="text-sm font-black text-slate-700 tracking-tight">{selectedDateFilter} - {journalMonthLabel.split(' ')[0]}</span>
                  </button>

                  {isCalendarOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsCalendarOpen(false)} />
                      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 z-50 p-4 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/60 shadow-xl w-64 animate-fade-up">
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                            <button
                              key={day}
                              onClick={() => { changeDateFilter(() => day); setIsCalendarOpen(false); }}
                              className={`aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all ${selectedDateFilter === day
                                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 scale-105'
                                  : 'text-slate-600 hover:bg-purple-100 hover:text-purple-700'
                                }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => changeDateFilter(p => Math.min(daysInMonth, p + 1))}
                  disabled={selectedDateFilter >= daysInMonth}
                  className="p-2 rounded-xl text-slate-400 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- Jadval --- */}
        <div className="overflow-x-auto overscroll-x-contain rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <table className="w-full border-collapse text-[11px] text-slate-700">
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
              {entries.map((e, i) => (
                <DU46JournalRow
                  key={e._id || i}
                  e={e}
                  i={i}
                  viewMode={viewMode}
                  selectedDateFilter={selectedDateFilter}
                  userName={userName}
                  userRole={userRole}
                  journalMonth={journalMonth || ''}
                  isDispatcher={isDispatcher}
                  isCurrentMonth={isCurrentMonth}
                  DU46_WORKER_GROUP_ROLES={DU46_WORKER_GROUP_ROLES}
                  isBekatNavbatchisi={isBekatNavbatchisi}
                  isCreator={isCreator}
                  isCol3Finished={isCol3Finished}
                  isCol12Finished={isCol12Finished}
                  canIApprove={canIApprove}
                  isFinalApprover={isFinalApprover}
                  getWaitingForRole={getWaitingForRole}
                  update={update}
                  setTaskModalIdx={setTaskModalIdx}
                  handleKamchilikBoshlandiClick={handleKamchilikBoshlandiClick}
                  setApprovalChainModal={setApprovalChainModal}
                  handleKamchilikTasdiqlash={handleKamchilikTasdiqlash}
                  handleBartarafBajarildiClick={handleBartarafBajarildiClick}
                  handleBartarafTasdiqlash={handleBartarafTasdiqlash}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* ——— Qator qo'shish / o'chirish ————————————————— */}
        {isEditor && (() => {
          const canRemove = entries.length > 1 && !isMonthInPast(journalMonth)
          return (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!isMonthInPast(journalMonth) && (
                <button
                  onClick={addRow}
                  disabled={isSavingJournal}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 ${isSavingJournal
                      ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {isSavingJournal ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={3} />}
                  <span className="uppercase tracking-widest">{isSavingJournal ? "Saqlanmoqda..." : "Qator qo'shish"}</span>
                </button>
              )}
              {!isMonthInPast(journalMonth) && (
                <button
                  onClick={removeRow}
                  disabled={!canRemove || isSavingJournal}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition-all shadow-sm active:scale-95 ${!canRemove || isSavingJournal
                      ? 'border-slate-100 bg-slate-50/50 text-slate-300 cursor-not-allowed'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50'
                    }`}
                >
                  <Trash2 size={14} strokeWidth={3} />
                  <span className="uppercase tracking-widest">Qator o'chirish</span>
                </button>
              )}


            </div>
          )
        })()}

      </div>

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

      {/* ═══ Standart vazifa tanlash modali (3-ustun) ═══ */}
      {taskModalIdx !== null && (
        <TaskSelectModal
          onSelect={(text) => {
            update(taskModalIdx, 'kamchilik', text)
            setTaskModalIdx(null)
          }}
          onClose={() => setTaskModalIdx(null)}
        />
      )}
    </div>
  )
}
