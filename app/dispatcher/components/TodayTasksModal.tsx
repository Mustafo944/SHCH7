import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, X, BookOpen, AlertTriangle, Download, FileText, QrCode, Loader2, ChevronDown, ChevronUp, User } from 'lucide-react'
import { ReportEntry, StationJournal, DU46Entry, SHU2Entry, QRScanRecord, StationEquipments } from '@/types'
import { getTaskScans, getJournalsByStationId, getStationEquipments, TaskScan } from '@/lib/supabase-db'
import { getEntryDateStr } from '@/lib/utils/qr'

type TodayTask = {
  reportId: string
  entryIndex: number
  stationId: string
  stationName: string
  workerName: string
  entry: ReportEntry
  month: string
  taskText: string
  type: string
  reason?: string | null
  completedDate?: string | null
  done?: boolean
}

// visitedJournals* dagi nomlar → station_journals dagi journal_type
const JOURNAL_TYPE_BY_NAME: Record<string, string> = {
  'DU-46': 'du46',
  'SHU-2': 'shu2',
  'yerlatgich': 'yerlatgich',
  'alsnKod': 'alsnKod',
  'mpsFriksion': 'mpsFriksion',
  'dgaNazorat': 'dgaNazorat',
}

const JOURNAL_DISPLAY_NAMES: Record<string, string> = {
  'DU-46': 'DU-46 jurnali',
  'SHU-2': 'SHU-2 jurnali',
  'yerlatgich': 'Yerlatgich xabarlagichi jurnali (NSH-01 17.1.8)',
  'alsnKod': "ALSN kodlarini o'lchash jurnali (NSH-01 10.4)",
  'mpsFriksion': "MPS friksion tokini o'lchash jurnali (NSH-01 9.1.4)",
  'dgaNazorat': 'DGA ishlashini nazorat qilish jurnali (NSH-01 18.3.1)',
}

// Vazifa turi ('haftalik') → ReportEntry maydon qo'shimchasi ('Haftalik')
const capType = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

const fmtDateTime = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Jurnal yozuvini dispetcherga tushunarli "maydon: qiymat" juftliklarga aylantiradi.
// Bo'sh qiymatlar ko'rsatilmaydi.
function entryToPairs(journalType: string, e: any): [string, string][] {
  const pairs: [string, string][] = []
  const add = (label: string, val?: string) => { if (val && String(val).trim()) pairs.push([label, String(val).trim()]) }
  if (journalType === 'du46') {
    const d = e as DU46Entry
    add('№', d.nomber)
    add('Sana', [d.oyKun1, d.soatMinut1].filter(Boolean).join(' '))
    add('Kamchilik (3-ustun)', d.kamchilik)
    add('Boshladi', d.kamchilikImzo && d.kamchilikBajarildiAt ? `${d.kamchilikImzo} · ${fmtDateTime(d.kamchilikBajarildiAt)}` : d.kamchilikImzo)
    add('Bartaraf etildi (12-ustun)', d.bartarafInfo)
    add('Bajardi', d.bartarafImzo && d.bartarafBajarildiAt ? `${d.bartarafImzo} · ${fmtDateTime(d.bartarafBajarildiAt)}` : d.bartarafImzo)
    add('Navbatchi tasdig\'i', d.bartarafBBImzo || d.kamchilikBBImzo)
  } else if (journalType === 'shu2') {
    const s = e as SHU2Entry
    add('№', s.nomber)
    add('Sana', s.sana)
    add('Yozuv', s.yozuv)
    add('Imzo', s.tasdiqlaganImzo || s.imzo)
  } else if (journalType === 'yerlatgich') {
    add('Sana', e.sana)
    add('Kuchlanish nomi', e.kuchlanishNomi)
    add("O'lchangan qiymat", e.olchanganQiymat)
    add('Imzo', e.imzo)
  } else if (journalType === 'alsnKod') {
    add('Sana', e.sana)
    add('R/Z nomi', e.rzNomi)
    add('R/Z uzunligi', e.rzUzunligi)
    add("Juft yo'nalish (A)", e.juftYonalish)
    add("Toq yo'nalish (A)", e.toqYonalish)
    add('Izox', e.izox)
    add('Imzo', e.imzo)
  } else if (journalType === 'mpsFriksion') {
    add('Sana', e.sana)
    add('Str. №', e.strRaqami)
    add('Normal tok (+/-)', [e.normalTokPlus, e.normalTokMinus].filter(Boolean).join(' / '))
    add('Friksion tok (+/-)', [e.friksionTokPlus, e.friksionTokMinus].filter(Boolean).join(' / '))
    add('Izox', e.izox)
    add('Imzo', e.imzo)
  } else if (journalType === 'dgaNazorat') {
    add('Kun', e.sana)
    add('Rejali', e.rejali)
    add('Ishlagan vaqti', e.ishlaganVaqt)
    add("Yoqilg'i sarfi (M.S)", e.yoqilgiSarfi)
    add("Yonilg'i istemoli (L)", e.yoqilgiIstemoli)
    add('Imzo', e.imzo)
  }
  return pairs
}

// Vazifa matnidan NSH kodini ajratadi: "[NSH-17 17.1] ..." → "NSH-17 17.1"
const extractTaskNsh = (taskText: string): string | null => {
  const match = (taskText || '').match(/^\[([^\]]*)\]/)
  return match ? match[1].trim() : null
}

// Bekat jurnallari ichidan aynan shu vazifaga tegishli yozuvlarni topadi
function findTaskJournalEntries(task: TodayTask, journals: StationJournal[], journalType: string): any[] {
  const journal = journals.find(j => j.journalType === journalType)
  if (!journal) return []
  const entries = journal.entries as any[]
  const firstLine = (task.taskText || '').split('\n')[0].trim()
  const taskNsh = extractTaskNsh(task.taskText)
  const day = parseInt((task.entry.ragat || '').trim(), 10)

  if (journalType === 'du46') {
    // DU-46 yozuvlari vazifaga aniq bog'lanadi (linked* maydonlari)
    return entries.filter(e =>
      e.linkedReportId === task.reportId &&
      e.linkedEntryIndex === task.entryIndex &&
      e.linkedTaskType === task.type
    )
  }
  if (journalType === 'shu2') {
    // SHU-2 avtomatik to'ldirilganda yozuv vazifa matnining birinchi qatori bilan
    // bir xil bo'ladi; qo'lda yozilganda hech bo'lmasa NSH kodi yozilgan bo'lishi mumkin.
    // MUHIM: matnning o'zi yetarli emas — "Har kuni" davriylikdagi ish oyning har
    // kunida bir xil matn bilan yoziladi, shuning uchun sana ham vazifa kuniga
    // (yoki kechikib bajarilgan bo'lsa, bajarilgan kunga) mos kelishi shart.
    const [, mm] = task.month.split('-')
    const taskMonthNum = parseInt(mm, 10)
    // Qabul qilinadigan (kun, oy) juftliklari
    const acceptDays: { d: number; m: number }[] = []
    if (!isNaN(day) && !isNaN(taskMonthNum)) acceptDays.push({ d: day, m: taskMonthNum })
    if (task.completedDate) {
      const comp = new Date(task.completedDate)
      if (!isNaN(comp.getTime())) acceptDays.push({ d: comp.getDate(), m: comp.getMonth() + 1 })
    }
    return entries.filter(e => {
      if (e.journalMonth !== task.month) return false
      const yozuv = (e.yozuv || '') as string
      const textMatch = (firstLine && yozuv.includes(firstLine)) || (taskNsh && yozuv.includes(`[${taskNsh}]`))
      if (!textMatch) return false
      if (acceptDays.length === 0) return true
      const sanaMatch = String(e.sana || '').match(/(\d{1,2})[.\-/](\d{1,2})/)
      if (!sanaMatch) return false
      const sd = parseInt(sanaMatch[1], 10)
      const sm = parseInt(sanaMatch[2], 10)
      return acceptDays.some(a => a.d === sd && a.m === sm)
    })
  }
  // Qolgan jurnallarda vazifaga to'g'ridan-to'g'ri bog'lanish yo'q —
  // oy va sana (kun raqami) bo'yicha moslashtiramiz
  return entries.filter(e => {
    if (e.journalMonth !== task.month) return false
    const sanaDay = parseInt(String(e.sana || '').match(/\d{1,2}/)?.[0] || '', 10)
    return !isNaN(day) && !isNaN(sanaDay) && sanaDay === day
  })
}

// QR kod qiymatidan ("smart-shch-<stationId>-<itemId>") qurilmaning odam o'qiy
// oladigan nomini topadi. Uskunalar ro'yxatida topilmasa, xom qiymat qaytadi.
function resolveEquipmentName(qrValue: string, stationId: string, eq: StationEquipments | null): string {
  if (!eq) return qrValue
  const prefix = `smart-shch-${stationId}-`
  const itemId = qrValue.startsWith(prefix) ? qrValue.slice(prefix.length) : qrValue
  for (const cat of eq.categories || []) {
    const item = (cat.items || []).find(it => it.id === itemId || it.id === qrValue)
    if (item) return item.name
  }
  return qrValue
}

// ═══ Skanerlangan qurilmalar progress halqasi ═══
function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : (done > 0 ? 100 : 0)
  const r = 21
  const c = 2 * Math.PI * r
  const color = pct >= 100 ? '#10b981' : pct > 0 ? '#3b82f6' : '#cbd5e1'
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label={`${done} / ${total} qurilma skanerlangan`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="900" fill="#334155">{pct}%</text>
    </svg>
  )
}

// TaskDetails yuklaydigan ma'lumotlar to'plami
type TaskDetailsData = { journals: StationJournal[]; equipments: StationEquipments | null; scans: TaskScan[] }

// ═══ Bitta vazifaning tafsilotlari (jurnallar + QR skanerlar) ═══
function TaskDetails({ task, loadData }: { task: TodayTask; loadData: (task: TodayTask) => Promise<TaskDetailsData> }) {
  const [loading, setLoading] = useState(true)
  const [scans, setScans] = useState<TaskScan[]>([])
  const [journals, setJournals] = useState<StationJournal[]>([])
  const [equipments, setEquipments] = useState<StationEquipments | null>(null)

  const cap = capType(task.type)
  const visitedJournals: string[] = (task.entry[`visitedJournals${cap}` as keyof ReportEntry] as string[] | undefined) || []
  // task_scans dan topilmasa, report entry ichida saqlangan skanerlar zaxira bo'ladi
  const entryScans = ((task.entry[`scans${cap}` as keyof ReportEntry] as (string | QRScanRecord)[] | undefined) || [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadData(task)
      .then(data => {
        if (cancelled) return
        setJournals(data.journals)
        setScans(data.scans)
        setEquipments(data.equipments)
      })
      .catch(err => console.error('Tafsilotlarni yuklash xatosi:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.reportId, task.entryIndex, task.type, task.stationId])

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <Loader2 size={16} className="animate-spin text-slate-400" />
        <span className="text-[11px] font-bold text-slate-400">Tafsilotlar yuklanmoqda...</span>
      </div>
    )
  }

  // ── Jurnallar: visitedJournals bilan cheklanmaymiz — bekat jurnallaridan
  // vazifaga mos yozuvlarni HAR DOIM qidiramiz (masalan SHU-2 avtomatik
  // to'ldirilgan bo'lsa, visitedJournals bo'sh bo'lishi mumkin) ──
  const journalSections = Object.entries(JOURNAL_TYPE_BY_NAME)
    .map(([name, jType]) => ({
      name,
      jType,
      matched: findTaskJournalEntries(task, journals, jType),
      visited: visitedJournals.includes(name),
    }))
    .filter(s => s.matched.length > 0 || s.visited)
  const totalJournalEntries = journalSections.reduce((sum, s) => sum + s.matched.length, 0)

  // ── QR skanerlar: qurilma nomlarini uskunalar ro'yxatidan tiklaymiz ──
  const taskNsh = extractTaskNsh(task.taskText)
  const scanRows: { name: string; rawId: string; by?: string; at?: string }[] = (scans.length > 0
    ? scans.map(s => ({ raw: s.equipment_name, by: s.scanned_by as string | undefined, at: s.scanned_at as string | undefined }))
    : entryScans.map(s => typeof s === 'string'
      ? { raw: s, by: undefined as string | undefined, at: undefined as string | undefined }
      : { raw: s.equipmentId, by: s.scannedBy, at: s.scannedAt })
  ).map(s => ({ name: resolveEquipmentName(s.raw, task.stationId, equipments), rawId: s.raw, by: s.by, at: s.at }))

  // Vazifaga biriktirilgan (skanerlanishi kerak bo'lgan) qurilmalar ro'yxati
  const targetItems: { id: string; name: string }[] = (() => {
    if (!taskNsh || !equipments?.taskMappings) return []
    const mapping = equipments.taskMappings.find(tm => tm.taskNsh === taskNsh)
    if (!mapping) return []
    const reqTypes: string[] = Array.isArray(mapping.equipmentType) ? mapping.equipmentType : [mapping.equipmentType].filter(Boolean)
    return (equipments.categories || [])
      .filter(c => reqTypes.includes(c.id))
      .flatMap(c => (c.items || []).map(it => ({ id: it.id, name: it.name })))
  })()

  const prefix = `smart-shch-${task.stationId}-`
  const scannedItemIds = new Set(scanRows.map(s => s.rawId.startsWith(prefix) ? s.rawId.slice(prefix.length) : s.rawId))
  const scannedTargetCount = targetItems.filter(it => scannedItemIds.has(it.id)).length
  const scanTotal = targetItems.length > 0 ? targetItems.length : scanRows.length
  const scanDone = targetItems.length > 0 ? scannedTargetCount : scanRows.length
  const showQRSection = targetItems.length > 0 || scanRows.length > 0

  const scanInfoFor = (itemId: string) => scanRows.find(s => (s.rawId.startsWith(prefix) ? s.rawId.slice(prefix.length) : s.rawId) === itemId)

  return (
    <div className="mt-3 space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-4 sm:p-5 animate-fade-in">

      {/* ── Umumiy ko'rsatkichlar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-purple-50/60 p-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <BookOpen size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-black leading-none text-slate-900">{totalJournalEntries}</p>
            <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-purple-500">Jurnal yozuvi · {journalSections.length} ta jurnal</p>
          </div>
        </div>
        {showQRSection && (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5">
            <ProgressRing done={scanDone} total={scanTotal} />
            <div className="min-w-0">
              <p className="text-xl font-black leading-none text-slate-900">{scanDone}<span className="text-sm text-slate-400"> / {scanTotal}</span></p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-blue-500">Qurilma skanerlandi</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Jurnal yozuvlari ── */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <BookOpen size={13} /> Yozuv kiritilgan jurnallar
        </p>
        {journalSections.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white p-3.5">
            <AlertTriangle size={15} className="shrink-0 text-amber-400" />
            <p className="text-[11px] font-semibold text-slate-400">Bu vazifa bo&apos;yicha jurnal yozuvi topilmadi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {journalSections.map(({ name, jType, matched }) => (
              <div key={name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-purple-50/80 to-white px-3.5 py-2.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-black text-slate-800 min-w-0">
                    <BookOpen size={13} className="shrink-0 text-purple-500" />
                    <span className="truncate">{JOURNAL_DISPLAY_NAMES[name] || name}</span>
                  </p>
                  <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${matched.length > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                    {matched.length > 0 ? `${matched.length} ta yozuv` : "To'ldirilgan"}
                  </span>
                </div>
                {matched.length === 0 ? (
                  <p className="px-3.5 py-2.5 text-[10px] font-semibold text-slate-400">
                    Jurnal to&apos;ldirilgan deb belgilangan, lekin vazifaga bog&apos;liq aniq yozuv topilmadi
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {matched.map((e, mi) => (
                      <div key={mi} className="grid grid-cols-1 gap-x-4 gap-y-1 p-3.5 sm:grid-cols-2">
                        {entryToPairs(jType, e).map(([label, val]) => (
                          <div key={label} className={`flex gap-2 text-[11px] ${val.length > 60 ? 'sm:col-span-2' : ''}`}>
                            <span className="shrink-0 font-black text-slate-400">{label}:</span>
                            <span className="min-w-0 whitespace-pre-wrap break-words font-semibold text-slate-700">{val}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── QR skanerlangan qurilmalar ── */}
      {showQRSection && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <QrCode size={13} /> Skanerlangan qurilmalar
          </p>
          {targetItems.length > 0 ? (
            // Vazifaga biriktirilgan barcha qurilmalar — skanerlangani yashil, qolgani kutilmoqda
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {targetItems.map(item => {
                const scan = scanInfoFor(item.id)
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${scan ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'}`}
                  >
                    {scan
                      ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      : <Clock size={16} className="mt-0.5 shrink-0 text-slate-300" />}
                    <div className="min-w-0">
                      <p className={`text-[11px] font-black ${scan ? 'text-emerald-800' : 'text-slate-500'}`}>{item.name}</p>
                      {scan ? (
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] font-bold text-emerald-600/80">
                          {scan.by && <span className="inline-flex items-center gap-1"><User size={10} /> {scan.by}</span>}
                          {scan.at && <span className="inline-flex items-center gap-1"><Clock size={10} /> {fmtDateTime(scan.at)}</span>}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-300">Skanerlanmagan</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Biriktirilgan ro'yxat topilmadi — mavjud skanerlarning o'zini ko'rsatamiz
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {scanRows.map((s, si) => (
                <div key={si} className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-emerald-800 break-words">{s.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] font-bold text-emerald-600/80">
                      {s.by && <span className="inline-flex items-center gap-1"><User size={10} /> {s.by}</span>}
                      {s.at && <span className="inline-flex items-center gap-1"><Clock size={10} /> {fmtDateTime(s.at)}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TodayTasksModal({ type, tasks, onClose }: {
  type: 'bugunReja' | 'qolibKetgan' | 'sababliBajarilmagan'
  tasks: TodayTask[]
  onClose: () => void
}) {
  const [expandedStation, setExpandedStation] = useState<string | null>(null)
  // Qaysi vazifaning tafsilotlari ochiq (reportId|entryIndex|type kaliti)
  const [openDetailsKey, setOpenDetailsKey] = useState<string | null>(null)

  // ── Tafsilotlar keshi ──────────────────────────────────────────────────────
  // Bekat jurnallari va uskunalari katta JSON — har "Tafsilotlar" bosilganda
  // qayta yuklamaslik uchun Promise darajasida keshlaymiz (parallel ochishlar
  // ham bitta so'rovga birlashadi). Modal yopilib qayta ochilsa yangi kesh.
  const stationCacheRef = useRef(new Map<string, Promise<{ journals: StationJournal[]; equipments: StationEquipments | null }>>())
  const scansCacheRef = useRef(new Map<string, Promise<TaskScan[]>>())

  const getStationDataCached = useCallback((sid: string) => {
    let stationP = stationCacheRef.current.get(sid)
    if (!stationP) {
      stationP = Promise.all([
        getJournalsByStationId(sid),
        getStationEquipments(sid).catch(() => null),
      ]).then(([journals, equipments]) => ({ journals, equipments }))
      // Xato bo'lsa keyingi urinish qayta yuklab ko'rsin
      stationP.catch(() => stationCacheRef.current.delete(sid))
      stationCacheRef.current.set(sid, stationP)
    }
    return stationP
  }, [])

  const loadTaskDetails = useCallback((task: TodayTask): Promise<TaskDetailsData> => {
    const stationP = getStationDataCached(task.stationId)

    const taskNsh = extractTaskNsh(task.taskText)
    const taskDate = getEntryDateStr(task.month, task.entry.ragat)
    const scanKey = `${task.stationId}|${taskNsh}|${taskDate}`
    let scansP = scansCacheRef.current.get(scanKey)
    if (!scansP) {
      scansP = taskNsh ? getTaskScans(task.stationId, taskNsh, taskDate) : Promise.resolve([] as TaskScan[])
      scansP.catch(() => scansCacheRef.current.delete(scanKey))
      scansCacheRef.current.set(scanKey, scansP)
    }

    return Promise.all([stationP, scansP]).then(([sd, scans]) => ({ ...sd, scans }))
  }, [getStationDataCached])

  const grouped = useMemo(() => {
    const map: Record<string, { stationName: string; workerName: string; items: typeof tasks }> = {}
    tasks.forEach(t => {
      if (!map[t.stationId]) map[t.stationId] = { stationName: t.stationName, workerName: t.workerName, items: [] }
      map[t.stationId].items.push(t)
    })
    return map
  }, [tasks])

  const stationEntries = Object.entries(grouped)
  const todayDate = new Date()
  const todayFormatted = `${String(todayDate.getDate()).padStart(2, '0')}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${todayDate.getFullYear()}`

  let title = ''
  let headerColor = ''
  let titleColor = ''

  if (type === 'bugunReja') {
    title = 'BUGUNGI ISHLAR RO\'YXATI'
    headerColor = 'bg-blue-50/50 border-blue-100'
    titleColor = 'text-blue-900'
  } else if (type === 'qolibKetgan') {
    title = 'Bajarilmagan ishlar (Izoxsiz)'
    headerColor = 'bg-red-50/50 border-red-100'
    titleColor = 'text-red-900'
  } else {
    title = 'Sababli bajarilmagan ishlar (Arxiv)'
    headerColor = 'bg-orange-50/50 border-orange-100'
    titleColor = 'text-orange-900'
  }

  const downloadPDF = async () => {
    // jsPDF faqat tugma bosilganda yuklanadi — asosiy bundle kichrayadi
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFont("helvetica", "normal")
    doc.setFontSize(14)
    doc.text(`Sababli bajarilmagan ishlar xisoboti (Barcha bekatlar)`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Sana: ${todayFormatted}`, 14, 28)

    const tableData = tasks.map((t, i) => {
      let dateFormatted = t.entry.ragat
      if (t.entry.ragat && t.month && t.month.includes('-')) {
        const [yyyy, mm] = t.month.split('-')
        dateFormatted = `${String(t.entry.ragat.trim()).padStart(2, '0')}.${mm}.${yyyy}`
      }
      const status = t.completedDate ? 'Bajarilgan ✅' : 'Bajarilmagan ❌'
      
      return [
        i + 1,
        t.stationName,
        dateFormatted,
        t.taskText,
        t.reason || '',
        status
      ]
    })

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Bekat', 'Sana', 'Ish nomi', 'Sabab (Izox)', 'Holati']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [249, 115, 22] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 55 },
        4: { cellWidth: 55 },
        5: { cellWidth: 25 }
      }
    })

    doc.save(`Sababli_bajarilmagan_dispetcher_${todayDate.getTime()}.pdf`)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-white/85 backdrop-blur-3xl border border-white/60 shadow-2xl animate-scale-in">
        
        {/* HEADER */}
        <div className={`flex items-center justify-between border-b px-6 sm:px-8 py-5 sm:py-6 ${headerColor}`}>
          <div>
            <h3 className={`text-lg sm:text-xl font-black tracking-tight ${titleColor}`}>
              {title}
            </h3>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                {todayFormatted} · {tasks.length} ta ish · {stationEntries.length} ta bekat
              </p>
              {type === 'sababliBajarilmagan' && tasks.length > 0 && (
                <button onClick={downloadPDF} className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-md hover:bg-orange-200 transition-colors">
                  <Download size={14} /> Yuklash (PDF)
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-2.5 sm:p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
          {tasks.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300`}>
                  {type === 'bugunReja' ? <CheckCircle2 size={32} /> : type === 'sababliBajarilmagan' ? <BookOpen size={32} /> : <AlertTriangle size={32} />}
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  Bu ro'yxatda ishlar yo'q
                </p>
              </div>
            </div>
          ) : expandedStation === null ? (
            <div className="p-4 sm:p-6 space-y-2">
              {stationEntries.map(([stationId, { stationName, workerName, items }]) => {
                const doneCount = items.filter(t => t.done).length;
                return (
                <button
                  key={stationId}
                  onClick={() => {
                    setExpandedStation(stationId)
                    // Bekat ochilishi bilan jurnallar/uskunalarni oldindan yuklab qo'yamiz —
                    // "Tafsilotlar" bosilganda ma'lumot allaqachon keshda bo'ladi
                    getStationDataCached(stationId).catch(() => {})
                  }}
                  className={`w-full flex items-center justify-between rounded-2xl border p-4 sm:p-5 transition-all hover:shadow-md active:scale-[0.98] group bg-white/70 border-white/60 hover:bg-white/90`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">{stationName}</h4>
                        {type === 'bugunReja' && items.length === doneCount && doneCount > 0 && (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 truncate">{workerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200/60">
                      <span className="text-[10px] sm:text-xs font-black text-slate-600">{items.length} ta ish</span>
                    </div>
                    {type === 'bugunReja' && doneCount > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100/50">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span className="text-[10px] sm:text-xs font-black text-emerald-600">{doneCount} ta bajarildi</span>
                      </div>
                    )}
                    <ChevronRight size={20} className="shrink-0 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                </button>
              )})}
            </div>
          ) : (
            <div>
              <div className={`sticky top-0 z-10 flex items-center gap-3 border-b px-4 sm:px-6 py-3 bg-white/70 backdrop-blur-md border-white/50`}>
                <button
                  onClick={() => setExpandedStation(null)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/80 border border-slate-200/60 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Bekatlar</span>
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-900 truncate">{grouped[expandedStation]?.stationName}</h4>
                    <p className="text-[9px] font-bold text-slate-400 truncate">{grouped[expandedStation]?.workerName}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-5 space-y-2.5">
                {grouped[expandedStation]?.items.map((task, ti) => {
                  const text = task.taskText || ''
                  let dateFormatted = task.entry.ragat
                  if (task.entry.ragat && task.month && task.month.includes('-')) {
                    const [yyyy, mm] = task.month.split('-')
                    dateFormatted = `${String(task.entry.ragat.trim()).padStart(2, '0')}.${mm}.${yyyy}`
                  }
                  
                  const isCompletedAfter = !!task.completedDate
                  const detailsKey = `${task.reportId}|${task.entryIndex}|${task.type}`
                  const isDetailsOpen = openDetailsKey === detailsKey
                  const canShowDetails = task.done || isCompletedAfter

                  return (
                    <div key={ti} className="rounded-xl border p-4 sm:p-5 transition-colors bg-white/70 border-white/60 hover:bg-white/90">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wide border ${isCompletedAfter ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {isCompletedAfter ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          Sana: {dateFormatted}
                        </span>
                        {task.done && type === 'bugunReja' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 rounded-md shrink-0">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            <span className="text-[10px] font-black uppercase text-emerald-700">Bajarilgan</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</p>

                      {task.reason && (
                        <div className="mt-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100/50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-orange-800/50 mb-1">Izox:</p>
                          <p className="text-[11px] font-semibold text-orange-900 leading-relaxed">{task.reason}</p>
                        </div>
                      )}

                      {isCompletedAfter && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 rounded-md">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span className="text-[10px] font-black uppercase text-emerald-700">Kechikib bo'lsa ham bajarildi</span>
                        </div>
                      )}

                      {canShowDetails && (
                        <button
                          onClick={() => setOpenDetailsKey(isDetailsOpen ? null : detailsKey)}
                          className={`mt-3 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${isDetailsOpen
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-600'}`}
                        >
                          <FileText size={13} />
                          Tafsilotlar
                          {isDetailsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      )}

                      {isDetailsOpen && <TaskDetails task={task} loadData={loadTaskDetails} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
