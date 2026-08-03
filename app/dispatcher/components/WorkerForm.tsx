import React, { useRef } from 'react'
import { X, Camera } from 'lucide-react'
import { Role, Station } from '@/types'
import { FormGroup } from './ui'

export function WorkerForm({ onSubmit, onCancel, form, setForm, isEdit, stations, message, setFormMsg }: {
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  form: { fullName: string; login: string; password?: string; phone: string; role: Exclude<Role, 'dispatcher'>; stationIds: string[]; photoFile?: File | null; photoPreview?: string | null }
  setForm: React.Dispatch<React.SetStateAction<{ fullName: string; login: string; password?: string; phone: string; role: Exclude<Role, 'dispatcher'>; stationIds: string[]; photoFile?: File | null; photoPreview?: string | null }>>
  isEdit: boolean
  stations: { id: string; name: string }[]
  message: { type: 'ok' | 'err'; text: string } | null
  setFormMsg: (msg: { type: 'ok' | 'err'; text: string } | null) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 150x150 kvadrat
        canvas.width = 150
        canvas.height = 150

        // Kvadrat ichiga kesish (object-cover effekti)
        const size = Math.min(img.width, img.height)
        const x = (img.width - size) / 2
        const y = (img.height - size) / 2

        ctx.drawImage(img, x, y, size, size, 0, 0, 150, 150)

        // Compress
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                type: 'image/webp',
                lastModified: Date.now(),
              })
              setForm(prev => ({ ...prev, photoFile: compressedFile, photoPreview: canvas.toDataURL('image/webp', 0.8) }))
            }
          },
          'image/webp',
          0.8
        )
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }
  return (
    <form onSubmit={onSubmit} className="premium-card p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{isEdit ? 'Xodimni tahrirlash' : 'Yangi xodim qo\'shish'}</h2>
          <p className="text-sm text-slate-500">Tizimga kirish uchun login va bekatlarni biriktiring.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="mb-8 flex justify-center">
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="h-24 w-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-blue-400 transition-colors"
          >
            {form.photoPreview ? (
              // `next/image` ataylab ishlatilmaydi: bu manba tanlangan faylning
              // lokal blob/data URL'i — Next optimizatori uni qayta ishlay olmaydi.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photoPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors">
                <Camera size={28} />
                <span className="text-[10px] font-bold mt-1">Rasm</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="F.I.SH" value={form.fullName} onChange={(val) => setForm({ ...form, fullName: val })} placeholder="Masalan: Azizov Aziz" />
            <FormGroup label="Login" value={form.login} onChange={(val) => setForm({ ...form, login: val })} placeholder="azizov123" />
            <FormGroup label="Parol" value={form.password || ''} onChange={(val) => setForm({ ...form, password: val })} placeholder="••••••••" type="password" />
            <FormGroup label="Telefon" value={form.phone} onChange={(val) => setForm({ ...form, phone: val })} placeholder="+99890..." />
          </div>

          <div>
            <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">Lavozimi</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button type="button" onClick={() => setForm({ ...form, role: 'worker', stationIds: [] })} className={`rounded-xl py-3 px-2 text-xs font-bold border transition-all duration-200 ${form.role === 'worker' ? 'bg-sky-50 border-sky-400 text-sky-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>Katta Elektromexanik</button>
              <button type="button" onClick={() => setForm({ ...form, role: 'elektromexanik', stationIds: [] })} className={`rounded-xl py-3 px-2 text-xs font-bold border transition-all duration-200 ${form.role === 'elektromexanik' ? 'bg-sky-50 border-sky-400 text-sky-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>Elektromexanik</button>
              <button type="button" onClick={() => setForm({ ...form, role: 'elektromontyor', stationIds: [] })} className={`rounded-xl py-3 px-2 text-xs font-bold border transition-all duration-200 ${form.role === 'elektromontyor' ? 'bg-sky-50 border-sky-400 text-sky-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>Elektromontyor</button>
              <button type="button" onClick={() => setForm({ ...form, role: 'bekat_boshlighi', stationIds: [] })} className={`rounded-xl py-3 px-2 text-xs font-bold border transition-all duration-200 ${form.role === 'bekat_boshlighi' ? 'bg-amber-50 border-amber-400 text-amber-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>Bekat Boshlig'i</button>
              <button type="button" onClick={() => setForm({ ...form, role: 'bekat_navbatchisi', stationIds: [] })} className={`rounded-xl py-3 px-2 text-xs font-bold border transition-all duration-200 ${form.role === 'bekat_navbatchisi' ? 'bg-amber-50 border-amber-400 text-amber-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>Bekat Navbatchisi</button>
              <button type="button" onClick={() => setForm({ ...form, role: 'yul_ustasi', stationIds: [] })} className={`rounded-xl py-3 px-2 text-xs font-bold border transition-all duration-200 ${form.role === 'yul_ustasi' ? 'bg-emerald-50 border-emerald-400 text-emerald-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>Yo'l Ustasi</button>
              <button type="button" onClick={() => setForm({ ...form, role: 'ech_xodimi', stationIds: [] })} className={`rounded-xl py-3 px-2 text-xs font-bold border transition-all duration-200 ${form.role === 'ech_xodimi' ? 'bg-emerald-50 border-emerald-400 text-emerald-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>ECH Xodimi</button>
              <button type="button" onClick={() => setForm({ ...form, role: 'mehnat_muhofazasi', stationIds: [] })} className={`rounded-xl py-3 px-2 text-xs font-bold border transition-all duration-200 ${form.role === 'mehnat_muhofazasi' ? 'bg-purple-50 border-purple-400 text-purple-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>Mehnat Muhofazasi</button>
            </div>
          </div>
        </div>

        {form.role !== 'mehnat_muhofazasi' && (
          <div className="rounded-2xl bg-slate-50/80 p-6 border border-slate-100">
            <label className="mb-4 block text-[10px] font-black uppercase tracking-widest text-slate-400">Bekatlarni biriktirish ({form.stationIds.length})</label>
            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {stations.map((s: Station) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    const exists = form.stationIds.includes(s.id)
                    if (exists) {
                      setForm({ ...form, stationIds: form.stationIds.filter((id: string) => id !== s.id) })
                    } else {
                      const max = ['worker', 'elektromexanik', 'katta_elektromexanik'].includes(form.role) ? 6 : form.role === 'bekat_boshlighi' ? 3 : 1
                      if (form.stationIds.length >= max) {
                        setFormMsg({ type: 'err', text: `Bu lavozim uchun ko'pi bilan ${max} ta bekat tanlash mumkin` })
                        setTimeout(() => setFormMsg(null), 3000)
                      } else {
                        setForm({ ...form, stationIds: [...form.stationIds, s.id] })
                      }
                    }
                  }}
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold border transition-all duration-200 ${form.stationIds.includes(s.id) ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-200/50'}`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${form.stationIds.includes(s.id) ? 'bg-sky-500' : 'bg-slate-200'}`} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className={`mt-8 rounded-xl p-4 text-center text-sm font-bold ${message.type === 'ok' ? 'badge-success' : 'badge-danger'}`}>
          {message.text}
        </div>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <button type="submit" className="btn-gradient rounded-xl px-10 py-4 text-sm font-black text-white shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-95">
          {isEdit ? 'Yangilash' : 'Xodimni qo\'shish'}
        </button>
      </div>
    </form>
  )
}
