import React, { useState, useCallback, useEffect } from 'react'
import { Plus, MapPin, Eye, Trash2, X } from 'lucide-react'
import { StationSchema } from '@/types'
import { getSchemasByStation, uploadSchemaFile, deleteSchema } from '@/lib/supabase-db'
import { FormGroup } from './ui'

export function SchemasView({ stationId, userName }: { stationId: string, userName: string }) {
  const [schemas, setSchemasState] = useState<StationSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [schemaMsg, setSchemaMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

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
        {schemas.length === 0 && <div className="col-span-full py-12 text-center text-slate-300">Hali sxemalar yuklanmagan.</div>}
      </div>

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
            <h3 className="text-lg font-black text-slate-900">Sxemani o'chirish</h3>
            <p className="mt-2 text-sm text-slate-500">Haqiqatdan ham sxemani o'chirishni xohlaysizmi?</p>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setDeleteSchemaConfirmId(null)} className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Bekor qilish</button>
              <button onClick={confirmSchemaDelete} className="btn-gradient rounded-xl px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20">O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
