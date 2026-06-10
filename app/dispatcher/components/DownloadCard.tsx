import React, { useState } from 'react'
import { Download, Eye } from 'lucide-react'
import { StationSchema } from '@/types'

export function DownloadCard({ title, desc, existingFile, onUpload, onDelete }: {
  title: string
  desc: string
  existingFile?: StationSchema
  onUpload: (file: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [dlMsg, setDlMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setDlMsg({ type: 'err', text: 'Faqat PDF fayllarni yuklash mumkin' })
      setTimeout(() => setDlMsg(null), 3000)
      return
    }

    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (err: unknown) {
      setDlMsg({ type: 'err', text: err instanceof Error ? err.message : 'Xatolik' })
      setTimeout(() => setDlMsg(null), 3000)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="premium-card group relative overflow-hidden p-8 transition-all duration-300 hover:scale-[1.02]">
      <div className="mb-6 rounded-2xl bg-slate-50/80 p-4 w-fit transition-transform duration-300 group-hover:scale-110">
        <Download className="text-cyan-400" size={32} />
      </div>
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{desc}</p>

      {dlMsg && (
        <div className={`mt-4 rounded-xl p-3 text-center text-xs font-bold ${dlMsg.type === 'ok' ? 'badge-success' : 'badge-danger'}`}>
          {dlMsg.text}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {existingFile ? (
          <>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-400">
              <span className="truncate max-w-[150px]">{existingFile.fileName}</span>
              <button
                onClick={() => onDelete(existingFile.id)}
                className="text-red-500 hover:text-red-600 transition-colors"
              >
                O'chirish
              </button>
            </div>
            <button
              onClick={() => window.open(existingFile.filePath, '_blank')}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:scale-105"
            >
              <Eye size={18} />
              Hujjatni Ko'rish
            </button>
          </>
        ) : (
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className={`flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isUploading ? 'Yuklanmoqda...' : 'Hujjatni Yuklash'}
            </div>
          </label>
        )}
      </div>
    </div>
  )
}
