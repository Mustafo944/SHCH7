'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, Loader2, FileText, Trash2 } from 'lucide-react'
import { getSchemasByStation, uploadSchemaFile, deleteSchema } from '@/lib/supabase-db'
import type { StationSchema } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  stationId: string
  equipmentName: string
  userName: string
  canEdit: boolean
}

export function EquipmentSchemaModal({ isOpen, onClose, stationId, equipmentName, userName, canEdit }: Props) {
  const [schemas, setSchemas] = useState<StationSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const [schemaName, setSchemaName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    let mounted = true
    setLoading(true)
    getSchemasByStation(stationId).then(allSchemas => {
      if (!mounted) return
      // Fayllarni ushbu qurilmaga tegishliligiga qarab filtrlaymiz (schema_type da uskuna nomi bor bo'lsa)
      // "Katta elektromexanik" faylni yuklayotganda uning type'iga "Uskuna Nomi: Sxema nomi" kabi yozadi
      const equipmentSchemas = allSchemas.filter(s => s.schemaType.startsWith(`[${equipmentName}] `))
      setSchemas(equipmentSchemas)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [isOpen, stationId, equipmentName])

  if (!isOpen) return null

  const handleUpload = async () => {
    if (!selectedFile || !schemaName.trim()) return
    setUploading(true)
    try {
      const type = `[${equipmentName}] ${schemaName.trim()}`
      const newSchema = await uploadSchemaFile(stationId, selectedFile, type, userName)
      setSchemas([newSchema, ...schemas])
      setSchemaName('')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (schemaId: string) => {
    if (!confirm("Haqiqatan ham ushbu sxemani o'chirmoqchimisiz?")) return
    setDeletingId(schemaId)
    try {
      await deleteSchema(stationId, schemaId)
      setSchemas(schemas.filter(s => s.id !== schemaId))
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-up overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{equipmentName} sxemalari</h3>
            <p className="text-xs font-bold text-slate-500 mt-0.5">Qurilma uchun chizmalar va sxemalar</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-colors active:scale-95">
            <X size={18} />
          </button>
        </div>

        {/* Ro'yxat va Yuklash */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          
          {canEdit && (
            <div className="mb-6 p-4 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50">
              <h4 className="text-sm font-bold text-purple-900 mb-3">Yangi sxema biriktirish</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={schemaName}
                  onChange={e => setSchemaName(e.target.value)}
                  placeholder="Sxema nomi (Masalan: Montaj sxema №12)"
                  className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-sm font-bold text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 file:transition-colors file:cursor-pointer"
                />
                <button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !schemaName.trim()}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black rounded-xl transition-colors shadow-lg shadow-purple-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  Yuklash va Saqlash
                </button>
              </div>
            </div>
          )}

          {/* Sxemalar ro'yxati */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Mavjud sxemalar</h4>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-purple-500" />
              </div>
            ) : schemas.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400">Sxemalar topilmadi</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schemas.map(schema => (
                  <div key={schema.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl hover:border-purple-300 transition-colors group shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* [EquipmentName] qismini olib tashlab ko'rsatamiz */}
                      <p className="text-sm font-black text-slate-800 truncate">
                        {schema.schemaType.replace(`[${equipmentName}] `, '')}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">{schema.fileName}</p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(schema.id)}
                        disabled={deletingId === schema.id}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        {deletingId === schema.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
