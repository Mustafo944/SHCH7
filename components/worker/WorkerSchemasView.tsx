import { useState, useEffect, useRef } from 'react'
import { Download, X, Map as MapIcon, Loader2 } from 'lucide-react'
import { getSchemasByStation } from '@/lib/supabase-db'
import type { StationSchema } from '@/types'
import { HeaderCard } from './BigActionCard'

/* ═══════════════════════════════════════════════════════════════════════
   WorkerSchemasView — bekat sxemalari
   ═══════════════════════════════════════════════════════════════════════ */

export function WorkerSchemasView({ stationId, stationName }: { stationId: string, stationName: string }) {
  const [schemas, setSchemasState] = useState<StationSchema[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [loadingSchemaId, setLoadingSchemaId] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (stationId) getSchemasByStation(stationId).then(setSchemasState)
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [stationId])

  // Firefox uchun blob URL orqali ko'rsatish
  const handlePreview = async (schema: StationSchema) => {
    try {
      setLoadingSchemaId(schema.id)
      // Agar oldin blob URL bo'lsa, tozalash
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)

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

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Bekat Sxemalari" subtitle={stationName} />
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
        {schemas.length === 0 && <div className="col-span-full py-24 text-center text-slate-300 font-black uppercase tracking-[0.3em] bg-white/80 backdrop-blur-sm rounded-2xl border border-dashed border-slate-200/60">Hali sxemalar yuklanmagan</div>}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md transition-all">
          <div className="flex h-[calc(100dvh-2rem)] w-full max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl animate-scale-in sm:h-[90vh] sm:max-h-[90vh]">
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
