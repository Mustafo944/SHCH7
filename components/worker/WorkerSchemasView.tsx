import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Download, X, Map as MapIcon, Loader2, FileText, ChevronRight, ArrowLeft, CheckCircle2, AlertTriangle, ExternalLink, Layers, Eye } from 'lucide-react'
import { getSchemasByStation } from '@/lib/supabase-db'
import { getTdmsDocumentsByStationName, getTdmsPages, getTdmsPageChecks, getTdmsPageChecksByPage, checkTdmsPage, type TdmsDocument, type TdmsPage, type TdmsPageCheck } from '@/lib/tdms-db'
import type { StationSchema } from '@/types'
import { HeaderCard } from './BigActionCard'
import useSWR from 'swr'

/* ═══════════════════════════════════════════════════════════════════════
   WorkerSchemasView — bekat sxemalari + texnik hujjatlar sxemalari
   ═══════════════════════════════════════════════════════════════════════ */

export function WorkerSchemasView({ stationId, stationName, userRole = '', userName = '' }: { stationId: string, stationName: string, userRole?: string, userName?: string }) {
  const [schemas, setSchemasState] = useState<StationSchema[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [loadingSchemaId, setLoadingSchemaId] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // TDMS documents state
  const [selectedTdmsDoc, setSelectedTdmsDoc] = useState<TdmsDocument | null>(null)
  const [selectedTdmsPage, setSelectedTdmsPage] = useState<TdmsPage | null>(null)

  useEffect(() => {
    if (stationId) getSchemasByStation(stationId).then(setSchemasState)
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [stationId])

  // TDMS hujjatlarni bekat nomi bo'yicha yuklash
  const { data: tdmsDocs = [] } = useSWR(
    stationName && stationName !== '...' ? `tdms_docs_worker_${stationName}` : null,
    () => getTdmsDocumentsByStationName(stationName)
  )

  // Firefox uchun blob URL orqali ko'rsatish
  const handlePreview = async (schema: StationSchema) => {
    try {
      setLoadingSchemaId(schema.id)
      // Agar oldin blob URL bo'lsa, tozalash
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)

      // Mobil brauzerlar blob: URL orqali yuklangan PDF'ni iframe ichida ko'rsata
      // olmaydi — o'rniga "Открыть" tugmasi chiqadi va bosilganda hech narsa
      // ochilmaydi. Shu sabab mobilda to'g'ridan-to'g'ri fayl manzilidan
      // foydalanamiz (blob workaround faqat desktop Firefox uchun kerak edi).
      const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent)
      if (isMobile) {
        setPreview(schema.filePath)
        return
      }

      const response = await fetch(schema.filePath)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      setPreview(url)
    } catch {
      // Fallback: to'g'ridan-to'g'ri URL
      setPreview(schema.filePath)
    } finally {
      setLoadingSchemaId(null)
    }
  }

  // Orqaga qaytish
  const handleBack = useCallback(() => {
    if (selectedTdmsPage) {
      setSelectedTdmsPage(null)
    } else if (selectedTdmsDoc) {
      setSelectedTdmsDoc(null)
    }
  }, [selectedTdmsPage, selectedTdmsDoc])

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Bekat Sxemalari" subtitle={stationName} />

      {/* ═══ Mavjud sxemalar (station_schemas) ═══ */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {schemas.map(s => (
          <div key={s.id} className="group relative overflow-hidden rounded-[32px] bg-white/30 p-8 backdrop-blur-[40px] border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.05)] transition-all hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(31,38,135,0.15)] hover:border-white/80">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 z-20" />
            <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white/90 to-white/50 text-indigo-600 transition-transform duration-300 group-hover:scale-110 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white/60"><MapIcon size={28} /></div>
            <h4 className="relative z-10 text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-900">{s.schemaType}</h4>
            <p className="relative z-10 mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{s.fileName}</p>
            <div className="relative z-10 mt-8 flex gap-3">
              <button 
                onClick={() => handlePreview(s)} 
                disabled={loadingSchemaId === s.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/50 border border-white/60 py-4 text-xs font-black uppercase text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 backdrop-blur-md transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-95 shadow-sm"
              >
                {loadingSchemaId === s.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  "Ko'rish"
                )}
              </button>
              <a href={s.filePath} download className="rounded-2xl bg-white/50 border border-white/60 p-4 text-indigo-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 backdrop-blur-md transition-all shadow-sm active:scale-95 flex items-center justify-center"><Download size={20} /></a>
            </div>
          </div>
        ))}
        {schemas.length === 0 && tdmsDocs.length === 0 && <div className="col-span-full py-24 text-center text-slate-300 font-black uppercase tracking-[0.3em] bg-white/80 backdrop-blur-sm rounded-2xl border border-dashed border-slate-200/60">Hali sxemalar yuklanmagan</div>}
      </div>

      {/* ═══ Texnik Hujjatlar sxemalari (TDMS) ═══ */}
      {tdmsDocs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="h-8 w-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600"><FileText size={18} /></div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Texnik hujjatlar sxemalari</h3>
          </div>

          {/* Hujjat tanlangan bo'lsa */}
          {selectedTdmsDoc ? (
            selectedTdmsPage ? (
              <TdmsPageDetailView
                page={selectedTdmsPage}
                userName={userName}
                userRole={userRole}
                onBack={handleBack}
                canCheck={userRole === 'katta_elektromexanik'}
              />
            ) : (
              <TdmsDocumentPagesView
                document={selectedTdmsDoc}
                onBack={handleBack}
                onPageClick={setSelectedTdmsPage}
                canCheck={userRole === 'katta_elektromexanik'}
              />
            )
          ) : (
            /* Hujjatlar ro'yxati */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tdmsDocs.map(doc => (
                <TdmsDocumentCard key={doc.id} document={doc} onClick={() => setSelectedTdmsDoc(doc)} />
              ))}
            </div>
          )}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md transition-all">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl animate-scale-in">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 px-8 py-4 bg-slate-50/80">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Sxema Ko&apos;rish</h3>
              <button onClick={() => { setPreview(null); if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null } }} className="rounded-xl border border-slate-200/60 bg-white/80 p-2 text-slate-400 hover:text-slate-900 backdrop-blur-sm transition-all shadow-sm"><X size={24} /></button>
            </div>
            {/* min-h-0 flex ichida kichrayish/scroll ishlashi uchun shart — aks holda iframe konteynerdan tashib ketishi mumkin */}
            <div className="min-h-0 flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <iframe src={preview} className="h-full w-full" title="Sxema ko'rish" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════════════
   TDMS Hujjat kartochkasi
   ═══════════════════════════════════════════════════════════════════════ */

function TdmsDocumentCard({ document, onClick }: { document: TdmsDocument, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-[28px] bg-white/30 p-6 backdrop-blur-[40px] border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.05)] transition-all hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(31,38,135,0.15)] hover:border-teal-300/60 text-left w-full active:scale-[0.98]"
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 z-20" />
      <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100/50 text-teal-600 transition-transform duration-300 group-hover:scale-110 shadow-sm border border-teal-200/40">
        <FileText size={24} />
      </div>
      <h4 className="relative z-10 text-base font-black text-slate-800 tracking-tight group-hover:text-teal-800 line-clamp-2">{document.name}</h4>
      <p className="relative z-10 mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{document.category}</p>
      <div className="relative z-10 mt-4 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400">{document.version.toLowerCase() !== 'v1' ? document.version : ''}</span>
        <div className="flex items-center gap-1 text-xs font-bold text-teal-500 group-hover:text-teal-700 transition-colors">
          Ochish <ChevronRight size={14} />
        </div>
      </div>
    </button>
  )
}


/* ═══════════════════════════════════════════════════════════════════════
   TDMS Hujjat varaqlari ko'rinishi (PagesList)
   ═══════════════════════════════════════════════════════════════════════ */

function TdmsDocumentPagesView({ document, onBack, onPageClick, canCheck }: {
  document: TdmsDocument
  onBack: () => void
  onPageClick: (page: TdmsPage) => void
  canCheck: boolean
}) {
  const { data: pages = [] } = useSWR(
    `tdms_pages_worker_${document.id}`,
    () => getTdmsPages(document.id)
  )

  const { data: allChecks = [] } = useSWR(
    `tdms_page_checks_worker_${document.id}`,
    () => getTdmsPageChecks(document.id)
  )

  const pageChecksMap = useMemo(() => {
    const map = new Map<string, TdmsPageCheck[]>()
    allChecks.forEach(c => {
      if (!map.has(c.page_id)) map.set(c.page_id, [])
      map.get(c.page_id)!.push(c)
    })
    return map
  }, [allChecks])

  const totalPages = pages.length
  const checkedPages = pages.filter(p => (pageChecksMap.get(p.id) || []).length > 0).length
  const progressPercent = totalPages > 0 ? Math.round((checkedPages / totalPages) * 100) : 0

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-xl bg-white/60 border border-white/40 backdrop-blur-md flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-slate-900 truncate">{document.name}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{document.station_name} • {document.category}</p>
        </div>
      </div>

      {/* Progress Bar */}
      {totalPages > 0 && (
        <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-700">Tekshiruv jarayoni</span>
            <span className="text-xs font-black text-teal-600">{checkedPages}/{totalPages} varaq ({progressPercent}%)</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: progressPercent === 100
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : progressPercent >= 50
                    ? 'linear-gradient(90deg, #14b8a6, #0d9488)'
                    : 'linear-gradient(90deg, #f59e0b, #d97706)',
              }}
            />
          </div>
        </div>
      )}

      {/* Pages Grid */}
      {pages.length === 0 ? (
        <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 p-12 text-center">
          <Layers size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-600 mb-2">Hali varaqlar yo&apos;q</h3>
          <p className="text-sm text-slate-400">Bu hujjatga varaqlar hali yuklanmagan</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {pages.map(page => {
            const pageChecks = pageChecksMap.get(page.id) || []
            const hasAnyCheck = pageChecks.length > 0
            const hasMismatch = pageChecks.some(c => c.status === 'mismatch')
            const allMatch = hasAnyCheck && !hasMismatch

            return (
              <button
                key={page.id}
                onClick={() => onPageClick(page)}
                className={`group relative rounded-2xl p-4 text-left transition-all active:scale-[0.97] border-2 backdrop-blur-md ${
                  hasMismatch
                    ? 'bg-red-50/60 border-red-200 hover:border-red-300 hover:shadow-md'
                    : allMatch
                      ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300 hover:shadow-md'
                      : 'bg-white/40 border-white/40 hover:border-slate-200 hover:shadow-md hover:bg-white/60'
                }`}
              >
                <div className={`text-2xl font-black mb-2 ${
                  hasMismatch ? 'text-red-500' : allMatch ? 'text-emerald-500' : 'text-slate-300'
                }`}>
                  {page.page_number}
                </div>
                <p className="text-[10px] font-bold text-slate-600 line-clamp-2 mb-2">
                  {page.name || `Varaq ${page.page_number}`}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400">{page.version.toLowerCase() !== 'v1' ? page.version : ''}</span>
                  {hasMismatch ? (
                    <AlertTriangle size={14} className="text-red-500" />
                  ) : allMatch ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : canCheck ? (
                    <span className="text-[9px] font-bold text-amber-500">Tekshirilmagan</span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════════════
   TDMS Varaq tafsiloti (PDF ko'rish + Tekshirish)
   ═══════════════════════════════════════════════════════════════════════ */

function TdmsPageDetailView({ page, userName, userRole, onBack, canCheck }: {
  page: TdmsPage
  userName: string
  userRole: string
  onBack: () => void
  canCheck: boolean
}) {
  const { data: checks = [], mutate: mutateChecks } = useSWR(
    `tdms_page_checks_worker_detail_${page.id}`,
    () => getTdmsPageChecksByPage(page.id)
  )

  const [showCheckOptions, setShowCheckOptions] = useState(false)
  const [showMismatchForm, setShowMismatchForm] = useState(false)
  const [mismatchComment, setMismatchComment] = useState('')
  const [checkError, setCheckError] = useState<string | null>(null)
  const [checkSuccess, setCheckSuccess] = useState<string | null>(null)

  const handleCheck = async (status: 'matches' | 'mismatch') => {
    try {
      if (status === 'mismatch' && !mismatchComment.trim()) {
        setCheckError("Iltimos, izoh yozing!")
        return
      }
      const roleName = userRole === 'katta_elektromexanik' ? 'Katta elektromexanik' : userRole
      await checkTdmsPage(page.id, userName, roleName, 'general', status, status === 'mismatch' ? mismatchComment : undefined)
      mutateChecks()
      setShowMismatchForm(false)
      setShowCheckOptions(false)
      setMismatchComment('')
      setCheckError(null)
      setCheckSuccess(status === 'mismatch' ? "Izoh yuborildi!" : "Tasdiqlandi! ✅")
      setTimeout(() => setCheckSuccess(null), 3000)
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  }

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-xl bg-white/60 border border-white/40 backdrop-blur-md flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-slate-900">{page.name || `Varaq ${page.page_number}`}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {page.version.toLowerCase() !== 'v1' ? `${page.version} • ` : ''}Yuklagan: {page.uploaded_by}
          </p>
        </div>
      </div>

      {/* PDF / Rasm ko'rish */}
      <div className="relative w-full rounded-2xl overflow-hidden border-2 border-white/40 bg-white/40 backdrop-blur-md group" style={{ height: '55vh' }}>
        {page.drive_url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.drive_url} alt="Sxema" className="w-full h-full object-contain" />
        ) : (
          <iframe src={`${page.drive_url}#toolbar=0`} className="w-full h-full" title="Sxema" />
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={page.drive_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-black/50 text-white backdrop-blur-md hover:bg-black/70 flex items-center justify-center gap-1.5 text-[10px] font-black shadow-lg transition-colors"
            title="Kattalashtirish"
          >
            <ExternalLink size={14} />
            Kattalashtirish
          </a>
          <a
            href={page.drive_url}
            download
            className="p-2.5 rounded-xl bg-teal-500/80 text-white backdrop-blur-md hover:bg-teal-600 flex items-center justify-center gap-1.5 text-[10px] font-black shadow-lg transition-colors"
            title="Yuklab olish"
          >
            <Download size={14} />
            Yuklab olish
          </a>
        </div>
      </div>

      {/* Xabarlar */}
      {checkSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center text-sm font-bold text-emerald-700 animate-fade-in">
          {checkSuccess}
        </div>
      )}
      {checkError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-center text-sm font-bold text-red-700 animate-fade-in">
          {checkError}
        </div>
      )}

      {/* ═══ TEKSHIRISH (faqat katta_elektromexanik uchun) ═══ */}
      {canCheck && (
        <div>
          {!showCheckOptions && !showMismatchForm ? (
            <button
              onClick={() => setShowCheckOptions(true)}
              className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black text-sm hover:from-teal-600 hover:to-emerald-600 transition-all active:scale-[0.98] shadow-lg shadow-teal-200"
            >
              <CheckCircle2 size={22} />
              Tekshirish
            </button>
          ) : !showMismatchForm ? (
            <div className="space-y-3 animate-fade-in">
              <div className="flex gap-3">
                <button
                  onClick={() => { handleCheck('matches'); setShowCheckOptions(false) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-black hover:bg-emerald-100 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 size={20} />
                  Mos keladi ✅
                </button>
                <button
                  onClick={() => setShowMismatchForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-black hover:bg-red-100 transition-all active:scale-[0.98]"
                >
                  <AlertTriangle size={20} />
                  Mos kelmaydi ❌
                </button>
              </div>
              <button
                onClick={() => setShowCheckOptions(false)}
                className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                Bekor qilish
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 space-y-3 animate-fade-in">
              <label className="block text-xs font-black text-red-700">Izoh yozing — nima mos kelmaydi?</label>
              <textarea
                value={mismatchComment}
                onChange={(e) => setMismatchComment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-red-200 bg-white text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none resize-none"
                rows={3}
                placeholder="Masalan: 5-rele sxemada bor, lekin bekatda yo'q..."
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowMismatchForm(false); setShowCheckOptions(false); setMismatchComment('') }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={() => { handleCheck('mismatch'); setShowCheckOptions(false) }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
                >
                  Yuborish
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tekshiruvlar tarixi */}
      {checks.length > 0 && (
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tekshiruvlar tarixi</h4>
          <div className="space-y-2">
            {checks.map(c => {
              const isMismatch = c.status === 'mismatch'
              return (
                <div key={c.id} className={`flex flex-col px-4 py-3 rounded-xl border ${isMismatch ? 'bg-red-50/60 border-red-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isMismatch ? <AlertTriangle size={16} className="text-red-500" /> : <CheckCircle2 size={16} className="text-emerald-500" />}
                      <span className="text-xs font-black text-slate-800">{c.checked_by}</span>
                      {c.checked_role && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white shadow-sm text-slate-500 border border-slate-200">{c.checked_role}</span>}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{new Date(c.checked_at).toLocaleDateString('uz')}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-start gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${isMismatch ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {isMismatch ? '❌ Mos kelmaydi' : '✅ Mos keladi'}
                    </span>
                    {c.comment && (
                      <p className="text-xs text-red-700 font-medium">💬 {c.comment}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
