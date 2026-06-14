import React from 'react'
import { X } from 'lucide-react'
import { Role, Station } from '@/types'
import { FormGroup } from './ui'

export function WorkerForm({ onSubmit, onCancel, form, setForm, isEdit, stations, message, setFormMsg }: {
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  form: { fullName: string; login: string; password?: string; phone: string; role: Exclude<Role, 'dispatcher'>; stationIds: string[] }
  setForm: React.Dispatch<React.SetStateAction<{ fullName: string; login: string; password?: string; phone: string; role: Exclude<Role, 'dispatcher'>; stationIds: string[] }>>
  isEdit: boolean
  stations: { id: string; name: string }[]
  message: { type: 'ok' | 'err'; text: string } | null
  setFormMsg: (msg: { type: 'ok' | 'err'; text: string } | null) => void
}) {
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
                    const max = form.role === 'worker' ? 5 : form.role === 'bekat_boshlighi' ? 3 : 1
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
