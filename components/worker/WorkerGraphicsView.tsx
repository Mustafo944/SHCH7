import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { getGlobalGraphics } from '@/lib/supabase-db'
import type { StationSchema } from '@/types'
import { HeaderCard } from './BigActionCard'

/* ═══════════════════════════════════════════════════════════════════════
   GrafikCard — bitta grafik kartochkasi
   ═══════════════════════════════════════════════════════════════════════ */

function GrafikCard({
  title,
  file,
  onPreview,
}: {
  title: string
  file?: StationSchema
  onPreview: (filePath: string) => void
}) {
  return (
    <div className="group relative overflow-hidden rounded-[32px] bg-white/30 p-6 backdrop-blur-[40px] border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.05)] transition-all hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(31,38,135,0.15)] hover:border-white/80">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 z-20" />
      <div className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/90 to-white/50 text-indigo-600 transition-transform duration-300 group-hover:scale-110 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white/60">
        <Download size={24} />
      </div>

      <h4 className="relative z-10 font-black text-slate-800 tracking-tight text-lg group-hover:text-indigo-900">{title}</h4>
      <p className="relative z-10 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        {file ? file.fileName : 'Fayl joylanmagan'}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-2">
        <button
          onClick={() => file && onPreview(file.filePath)}
          disabled={!file}
          className="rounded-xl bg-slate-50/80 border border-slate-100 py-3 text-[10px] font-black uppercase text-slate-500 hover:bg-purple-600 hover:text-white backdrop-blur-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95"
        >
          Ko&apos;rish
        </button>
        <a
          href={file?.filePath || '#'}
          download
          target="_blank"
          rel="noreferrer"
          className={`flex items-center justify-center rounded-xl border border-slate-100 py-3 text-[10px] font-black uppercase backdrop-blur-sm transition-all shadow-sm active:scale-95 ${file ? 'bg-slate-50/80 text-slate-500 hover:bg-slate-900 hover:text-white' : 'pointer-events-none opacity-40 text-slate-300 bg-slate-50/80'
            }`}
        >
          Yuklash
        </a>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   WorkerGraphicsView — umumiy ish reja grafiklari
   ═══════════════════════════════════════════════════════════════════════ */

export function WorkerGraphicsView() {
  const [items, setItems] = useState<StationSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    getGlobalGraphics()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  const yillik = items.find(item => item.schemaType === 'yillik_ish_reja_grafiki')
  const haftalik = items.find(item => item.schemaType === 'haftalik_ish_reja_grafiki')

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200/60 bg-white/80 backdrop-blur-sm text-slate-300 font-bold uppercase tracking-widest">
        Yuklanmoqda...
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <HeaderCard title="Grafiklar" subtitle="Umumiy ish reja grafiklari" />

      <div className="grid gap-4 sm:grid-cols-2">
        <GrafikCard title="Yillik ish reja grafigi" file={yillik} onPreview={setPreview} />
        <GrafikCard title="4-haftalik ish reja grafigi" file={haftalik} onPreview={setPreview} />
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md transition-all">
          <div className="h-full w-full overflow-hidden rounded-none border border-slate-200/60 bg-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-3 bg-slate-50/80">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Grafik ko&apos;rish</h3>
              <div className="flex items-center gap-3">
                <a
                  href={preview}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-gradient rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  Yuklab olish
                </a>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-xl border border-slate-200/60 bg-white/80 p-2 text-slate-400 hover:text-slate-900 backdrop-blur-sm transition-all shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <iframe src={preview} className="h-[calc(100%-64px)] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}
