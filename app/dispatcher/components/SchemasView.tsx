import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Plus, MapPin, Eye, Trash2, X, FileText, ChevronRight, ArrowLeft, CheckCircle2, AlertTriangle, ExternalLink, Layers, Download } from 'lucide-react'
import { StationSchema } from '@/types'
import { getSchemasByStation, uploadSchemaFile, deleteSchema } from '@/lib/supabase-db'
import { getTdmsDocumentsByStationName, getTdmsPages, getTdmsPageChecks, getTdmsPageChecksByPage, type TdmsDocument, type TdmsPage, type TdmsPageCheck } from '@/lib/tdms-db'
import { FormGroup } from './ui'
import useSWR from 'swr'

export function SchemasView({ stationId, stationName = '', userName }: { stationId: string, stationName?: string, userName: string }) {
  const [schemas, setSchemasState] = useState<StationSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [schemaMsg, setSchemaMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // TDMS state
  const [selectedTdmsDoc, setSelectedTdmsDoc] = useState<TdmsDocument | null>(null)
  const [selectedTdmsPage, setSelectedTdmsPage] = useState<TdmsPage | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSchemasByStation(stationId)
      setSchemasState(data)
    } finally {
      setLoading(false)
    }
  }, [stationId])

  useEffect(() => { load() }, [load])

  // TDMS hujjatlarni bekat nomi bo'yicha yuklash
  const { data: tdmsDocs = [] } = useSWR(
    stationName ? `tdms_docs_dispatcher_${stationName}` : null,
    () => getTdmsDocumentsByStationName(stationName)
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName || !newFile) return
    setUploading(true)
    try {
      await uploadSchemaFile(stationId, newFile, newName, userName)
      setNewName(''); setNewFile(null); setShowForm(false)
      load()
    } catch (err: unknown) {
      setSchemaMsg({ type: 'err', text: err instanceof Error ? err.message : 'Xatolik' })
      setTimeout(() => setSchemaMsg(null), 3000)
    } finally {
      setUploading(false)
    }
  }

  const [deleteSchemaConfirmId, setDeleteSchemaConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleteSchemaConfirmId(id)
  }

  async function confirmSchemaDelete() {
    if (!deleteSchemaConfirmId) return
    await deleteSchema(stationId, deleteSchemaConfirmId)
    setDeleteSchemaConfirmId(null)
    load()
  }

  // TDMS orqaga qaytish
  const handleTdmsBack = useCallback(() => {
    if (selectedTdmsPage) {
      setSelectedTdmsPage(null)
    } else if (selectedTdmsDoc) {
      setSelectedTdmsDoc(null)
    }
  }, [selectedTdmsPage, selectedTdmsDoc])

  if (loading) return <div className="p-8 text-center text-slate-300">Yuklanmoqda...</div>

  return (
    <div className="space-y-6">
      {schemaMsg && (
        <div className={`rounded-xl p-4 text-center text-sm font-bold ${schemaMsg.type === 'ok' ? 'badge-success' : 'badge-danger'}`}>
          {schemaMsg.text}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Bekat xaritalari</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-white/60 backdrop-blur-sm border border-white/40 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-sm transition-all duration-200">
          <Plus size={16} />
          {showForm ? 'Bekor qilish' : 'Sxema yuklash'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="premium-card grid items-end gap-6 p-6 sm:grid-cols-[1fr_1fr_auto]">
          <FormGroup label="Sxema nomi" value={newName} onChange={setNewName} placeholder="Bir ipli sxema" />
          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Fayl (PDF)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setNewFile(e.target.files?.[0] || null)} className="w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-xs file:font-bold file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
          </div>
          <button disabled={uploading} type="submit" className="btn-gradient rounded-xl px-8 py-4 text-xs font-black text-white shadow-lg shadow-sky-500/20 transition-all duration-200 disabled:opacity-50">
            {uploading ? 'Yuklanmoqda...' : 'SAQLASH'}
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {schemas.map(s => (
          <div key={s.id} className="premium-card flex items-center justify-between p-5 transition-all duration-200 hover:shadow-md group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition-transform duration-200 group-hover:scale-110"><MapPin size={24} /></div>
              <div>
                <h4 className="text-sm font-black text-slate-900">{s.schemaType}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.fileName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview(s.filePath)} className="rounded-xl bg-slate-50 p-2.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-all duration-200 shadow-sm"><Eye size={18} /></button>
              <button onClick={() => handleDelete(s.id)} className="rounded-xl bg-red-50 p-2.5 text-red-500 hover:text-red-700 hover:bg-red-100 transition-all duration-200 shadow-sm"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {schemas.length === 0 && tdmsDocs.length === 0 && <div className="col-span-full py-12 text-center text-slate-300">Hali sxemalar yuklanmagan.</div>}
      </div>

      {/* ═══ Texnik Hujjatlar sxemalari (TDMS) — faqat ko'rish, tekshirish YO'Q ═══ */}
      {tdmsDocs.length > 0 && (
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600"><FileText size={18} /></div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Texnik hujjatlar sxemalari</h3>
          </div>

          {selectedTdmsDoc ? (
            selectedTdmsPage ? (
              <DispatcherTdmsPageDetail
                page={selectedTdmsPage}
                onBack={handleTdmsBack}
              />
            ) : (
              <DispatcherTdmsDocPages
                document={selectedTdmsDoc}
                onBack={handleTdmsBack}
                onPageClick={setSelectedTdmsPage}
              />
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tdmsDocs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedTdmsDoc(doc)}
                  className="premium-card flex items-center gap-4 p-5 transition-all duration-200 hover:shadow-md group text-left w-full"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-transform duration-200 group-hover:scale-110"><FileText size={24} /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-slate-900 truncate">{doc.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{doc.category}{doc.version.toLowerCase() !== 'v1' ? ` • ${doc.version}` : ''}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-teal-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="premium-card h-full w-full max-w-6xl overflow-hidden p-0 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 px-8 py-4">
              <h3 className="text-lg font-black text-slate-900">Sxema: {schemas.find(s => s.filePath === preview)?.schemaType}</h3>
              <button onClick={() => setPreview(null)} className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            </div>
            <iframe src={preview} className="h-[calc(100%-80px)] w-full" />
          </div>
        </div>
      )}

      {deleteSchemaConfirmId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="premium-card w-full max-w-md p-8 animate-scale-in">
            <h3 className="text-lg font-black text-slate-900">Sxemani o&apos;chirish</h3>
            <p className="mt-2 text-sm text-slate-500">Haqiqatdan ham sxemani o&apos;chirishni xohlaysizmi?</p>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setDeleteSchemaConfirmId(null)} className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Bekor qilish</button>
              <button onClick={confirmSchemaDelete} className="btn-gradient rounded-xl px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20">O&apos;chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════════════
   Dispetcher: TDMS Hujjat varaqlari (faqat ko'rish)
   ═══════════════════════════════════════════════════════════════════════ */

function DispatcherTdmsDocPages({ document, onBack, onPageClick }: {
  document: TdmsDocument
  onBack: () => void
  onPageClick: (page: TdmsPage) => void
}) {
  const { data: pages = [] } = useSWR(
    `tdms_pages_disp_${document.id}`,
    () => getTdmsPages(document.id)
  )

  const { data: allChecks = [] } = useSWR(
    `tdms_page_checks_disp_${document.id}`,
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95 shadow-sm">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-slate-900 truncate">{document.name}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{document.station_name} • {document.category}</p>
        </div>
      </div>

      {totalPages > 0 && (
        <div className="premium-card p-4">
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

      {pages.length === 0 ? (
        <div className="premium-card p-12 text-center">
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
                className={`group relative rounded-2xl p-4 text-left transition-all active:scale-[0.97] border-2 ${
                  hasMismatch
                    ? 'bg-red-50 border-red-200 hover:border-red-300 hover:shadow-md'
                    : allMatch
                      ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300 hover:shadow-md'
                      : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'
                }`}
              >
                <div className={`text-2xl font-black mb-2 ${
                  hasMismatch ? 'text-red-500' : allMatch ? 'text-emerald-500' : 'text-slate-300'
                }`}>
                  {page.page_number}
                </div>
                <p className="text-[10px] font-bold text-slate-600 line-clamp-2 mb-2">{page.name || `Varaq ${page.page_number}`}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400">{page.version.toLowerCase() !== 'v1' ? page.version : ''}</span>
                  {hasMismatch ? (
                    <AlertTriangle size={14} className="text-red-500" />
                  ) : allMatch ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400">Tekshirilmagan</span>
                  )}
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
   Dispetcher: TDMS Varaq tafsiloti (faqat ko'rish — tekshirish YO'Q)
   ═══════════════════════════════════════════════════════════════════════ */

function DispatcherTdmsPageDetail({ page, onBack }: {
  page: TdmsPage
  onBack: () => void
}) {
  const { data: checks = [] } = useSWR(
    `tdms_page_checks_disp_detail_${page.id}`,
    () => getTdmsPageChecksByPage(page.id)
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95 shadow-sm">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-slate-900">{page.name || `Varaq ${page.page_number}`}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{page.version.toLowerCase() !== 'v1' ? `${page.version} • ` : ''}Yuklagan: {page.uploaded_by}</p>
        </div>
      </div>

      {/* PDF / Rasm ko'rish */}
      <div className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50 group" style={{ height: '55vh' }}>
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

      {/* Tekshiruvlar tarixi (faqat ko'rish) */}
      {checks.length > 0 && (
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tekshiruvlar tarixi</h4>
          <div className="space-y-2">
            {checks.map(c => {
              const isMismatch = c.status === 'mismatch'
              return (
                <div key={c.id} className={`flex flex-col px-4 py-3 rounded-xl border ${isMismatch ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
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

      {checks.length === 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-sm font-bold text-amber-700">Bu varaq hali tekshirilmagan</p>
        </div>
      )}
    </div>
  )
}
