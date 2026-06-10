import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import useSWR from 'swr'
import { BookOpen, Plus, Eye, Trash2, Download, FileText, X, Edit2, Check } from 'lucide-react'
import { StationSchema } from '@/types'
import { getLibraryBooks, uploadLibraryBook, deleteLibraryBook, renameLibraryBook } from '@/lib/supabase-db'
import { FormGroup } from '../../app/dispatcher/components/ui'

interface LibraryViewProps {
  userName: string
  userRole: string
}

export function LibraryView({ userName, userRole }: LibraryViewProps) {
  const isDispatcher = userRole === 'dispatcher'

  const { data: books = [], isLoading: loading, mutate: reloadBooks } = useSWR('library_books', getLibraryBooks, {
    revalidateOnFocus: true,
    dedupingInterval: 5000
  })

  const [uploading, setUploading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [preview, setPreview] = useState<{ url: string, title: string, isImg: boolean } | null>(null)

  // Edit mode
  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle || !newFile) return
    setUploading(true)
    try {
      await uploadLibraryBook(newFile, newTitle, userName)
      setNewTitle('')
      setNewFile(null)
      await reloadBooks()
      setMsg({ type: 'ok', text: "Kitob muvaffaqiyatli yuklandi!" })
      setTimeout(() => setMsg(null), 3000)
    } catch (err: unknown) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Xatolik' })
      setTimeout(() => setMsg(null), 3000)
    } finally {
      setUploading(false)
    }
  }

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  async function confirmDelete() {
    if (!deleteConfirmId) return
    try {
      await deleteLibraryBook(deleteConfirmId)
      setDeleteConfirmId(null)
      await reloadBooks()
      setMsg({ type: 'ok', text: "O'chirildi" })
      setTimeout(() => setMsg(null), 3000)
    } catch (err: unknown) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Xatolik' })
      setTimeout(() => setMsg(null), 3000)
    }
  }

  async function saveEdit(id: string) {
    if (!editingTitle.trim()) return
    try {
      await renameLibraryBook(id, editingTitle.trim())
      setEditingId(null)
      await reloadBooks()
      setMsg({ type: 'ok', text: "Nomi o'zgartirildi" })
      setTimeout(() => setMsg(null), 3000)
    } catch (err: unknown) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Xatolik' })
      setTimeout(() => setMsg(null), 3000)
    }
  }

  // Fayl turini aniqlash (rasm yoki PDF)
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url)

  if (loading) return <div className="p-8 text-center text-slate-300">Kitoblar yuklanmoqda...</div>

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-xl p-4 text-center text-sm font-bold ${msg.type === 'ok' ? 'badge-success' : 'badge-danger'}`}>
          {msg.text}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <BookOpen size={16} /> Elektron Kutubxona
        </h3>
      </div>

      {isDispatcher && (
        <form onSubmit={handleAdd} className="premium-card grid items-end gap-6 p-6 sm:grid-cols-[1fr_1fr_auto] border border-purple-100">
          <FormGroup label="Kitob nomi" value={newTitle} onChange={setNewTitle} placeholder="Masalan: Elektromontyor yo'riqnomasi" />
          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Fayl (PDF/Rasm)</label>
            <input 
              type="file" 
              accept=".pdf,.png,.jpg,.jpeg" 
              onChange={(e) => {
                const f = e.target.files?.[0]
                setNewFile(f || null)
                // Agar yangi fayl tanlansa va hozircha nomi kiritilmagan bo'lsa, fayl nomini olamiz
                if (f && !newTitle) {
                  setNewTitle(f.name.replace(/\.[^/.]+$/, "")) // extensionni olib tashlaymiz
                }
              }} 
              className="w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-xs file:font-bold file:text-purple-700 hover:file:bg-purple-100 cursor-pointer" 
            />
          </div>
          <button disabled={uploading || !newFile || !newTitle} type="submit" className="relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-violet-500 to-purple-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-purple-500/25 transition-all hover:from-purple-700 hover:via-violet-600 hover:to-purple-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
            {uploading ? 'Yuklanmoqda...' : 'SAQLASH'}
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books.map(book => (
          <div key={book.id} className="premium-card flex flex-col justify-between p-5 transition-all duration-200 hover:shadow-md group border border-slate-100 hover:border-purple-200">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform duration-200 group-hover:scale-110">
                {isImage(book.filePath) ? <FileText size={24} /> : <BookOpen size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                {editingId === book.id ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="text" 
                      value={editingTitle} 
                      onChange={e => setEditingTitle(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-bold text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      autoFocus
                    />
                    <button onClick={() => saveEdit(book.id)} className="text-emerald-600 hover:text-emerald-700 p-1 bg-emerald-50 rounded"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <h4 className="text-sm font-black text-slate-900 break-words line-clamp-2" title={book.fileName}>{book.fileName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">Yuklagan: Aloqa dispetcheri</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
              <div className="flex gap-2">
                <button 
                  onClick={() => setPreview({ url: book.filePath, title: book.fileName, isImg: isImage(book.filePath) })} 
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors shadow-sm"
                >
                  <Eye size={16} /> O'qish
                </button>
                <a 
                  href={`${book.filePath}?download`} 
                  download 
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm"
                >
                  <Download size={16} />
                </a>
              </div>
              
              {isDispatcher && (
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(book.id); setEditingTitle(book.fileName); }} className="rounded-lg bg-slate-50 p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all duration-200"><Edit2 size={16} /></button>
                  <button onClick={() => setDeleteConfirmId(book.id)} className="rounded-lg bg-slate-50 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"><Trash2 size={16} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
        {books.length === 0 && <div className="col-span-full py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <BookOpen size={48} className="opacity-20" />
          <p>Kutubxona hozircha bo'sh.</p>
        </div>}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="premium-card w-full max-w-md p-8 animate-scale-in">
            <h3 className="text-lg font-black text-slate-900">Kitobni o'chirish</h3>
            <p className="mt-2 text-sm text-slate-500">Haqiqatdan ham ushbu kitobni/qo'llanmani o'chirishni xohlaysizmi?</p>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Bekor qilish</button>
              <button onClick={confirmDelete} className="btn-gradient rounded-xl px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20">O'chirish</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 sm:p-6 backdrop-blur-md animate-fade-up">
          <div className="premium-card h-[100dvh] w-full rounded-none sm:rounded-3xl sm:h-[85vh] sm:max-w-6xl overflow-hidden p-0 shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  {preview.isImg ? <FileText size={20} /> : <BookOpen size={20} />}
                </div>
                <h3 className="truncate text-sm sm:text-lg font-black text-slate-900">{preview.title}</h3>
              </div>
              <div className="flex gap-2 shrink-0 ml-4">
                <a href={`${preview.url}?download`} download className="flex h-10 w-10 sm:h-auto sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-50 sm:px-4 text-emerald-600 hover:bg-emerald-100 transition-colors">
                  <Download size={20} />
                  <span className="hidden sm:inline text-sm font-bold">Yuklab olish</span>
                </a>
                <button onClick={() => setPreview(null)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="h-[calc(100%-70px)] sm:h-[calc(100%-80px)] w-full bg-slate-100/50">
              {preview.isImg ? (
                <div className="h-full w-full overflow-auto p-4 flex items-center justify-center">
                  <img src={preview.url} alt={preview.title} className="max-h-full max-w-full object-contain rounded-xl shadow-lg" />
                </div>
              ) : (
                <iframe 
                  src={preview.url}
                  className="h-full w-full border-0" 
                  title={preview.title}
                  loading="lazy"
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
