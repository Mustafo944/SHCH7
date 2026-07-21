'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Search, Zap } from 'lucide-react'
import { getRelaysByStation, getCachedRelays, type Relay, type RelayStatus } from '@/lib/relenazorat'

const STATUS_META: Record<RelayStatus, { label: string; badge: string; dot: string }> = {
  green: { label: 'Soz', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  yellow: { label: 'Muddati kelgan', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  red: { label: 'Nosoz', badge: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
}

type Filter = 'all' | RelayStatus

/**
 * Bekat relelari ro'yxati — rele-nazorat bazasidan faqat o'qib ko'rsatadi.
 * Tashqi saytga o'tish va u yerda alohida login qilish talab etilmaydi:
 * ishchi qaysi bekatda bo'lsa, faqat o'sha bekat relelarini ko'radi.
 */
export function RelayListModal({
  stationName,
  onClose,
}: {
  stationName: string
  onClose: () => void
}) {
  const [relays, setRelays] = useState<Relay[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false

    // 1) Keshda bo'lsa — DARHOL ko'rsatamiz (bosh sahifa kartochkasi
    //    yuklanganda relelar allaqachon keshga tushgan bo'ladi).
    const cached = getCachedRelays(stationName)
    if (cached) {
      setRelays(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    // 2) Fonda har doim yangi nusxani tortamiz — yangi qo'shilgan rele
    //    modal har ochilganda ko'rinadi.
    getRelaysByStation(stationName, true)
      .then(list => { if (!cancelled) setRelays(list) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [stationName])

  const counts = useMemo(() => ({
    all: relays.length,
    green: relays.filter(r => r.status === 'green').length,
    yellow: relays.filter(r => r.status === 'yellow').length,
    red: relays.filter(r => r.status === 'red').length,
  }), [relays])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return relays.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false
      if (!q) return true
      return [r.name, r.num, r.stativ, r.note]
        .some(v => (v || '').toLowerCase().includes(q))
    })
  }, [relays, filter, search])

  const filterChips: { key: Filter; label: string; count: number; active: string }[] = [
    { key: 'all', label: 'Barchasi', count: counts.all, active: 'bg-slate-800 text-white border-slate-800' },
    { key: 'green', label: 'Soz', count: counts.green, active: 'bg-emerald-600 text-white border-emerald-600' },
    { key: 'yellow', label: 'Muddati kelgan', count: counts.yellow, active: 'bg-amber-500 text-white border-amber-500' },
    { key: 'red', label: 'Nosoz', count: counts.red, active: 'bg-red-600 text-white border-red-600' },
  ]

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="flex items-center justify-center rounded-xl bg-white p-2 text-slate-600 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Zap size={18} className="text-amber-500" /> Relelar holati
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stationName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Qidiruv va filtrlar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {filterChips.map(c => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`rounded-xl border px-3.5 py-2 text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 ${
                  filter === c.key ? c.active : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {c.label} · {c.count}
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nomi, raqami, stativ..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-300 font-bold uppercase tracking-widest">Yuklanmoqda...</div>
        ) : visible.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <Zap size={40} className="text-slate-200" />
            <p className="text-sm font-bold text-slate-400">
              {relays.length === 0 ? 'Bu bekat uchun rele topilmadi' : 'Filtrga mos rele yo\'q'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
            <table className="w-full min-w-[720px] border-collapse text-[12px] text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b-2 border-slate-200">
                <tr>
                  <th className="p-3 text-center border-r border-slate-200 w-[4%]">№</th>
                  <th className="p-3 text-left border-r border-slate-200">Rele nomi</th>
                  <th className="p-3 text-center border-r border-slate-200">Zavod raqami</th>
                  <th className="p-3 text-center border-r border-slate-200">Stativ / o&apos;rni</th>
                  <th className="p-3 text-center border-r border-slate-200">Tekshirilgan</th>
                  <th className="p-3 text-center border-r border-slate-200">Keyingi muddat</th>
                  <th className="p-3 text-center">Holati</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const meta = STATUS_META[r.status]
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-amber-50/40 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-bold border-r border-slate-100">{i + 1}</td>
                      <td className="p-3 font-bold text-slate-900 border-r border-slate-100">
                        {r.name}
                        {r.note && <p className="mt-0.5 text-[10px] font-medium text-slate-400">{r.note}</p>}
                      </td>
                      <td className="p-3 text-center font-medium border-r border-slate-100">{r.num || '—'}</td>
                      <td className="p-3 text-center font-medium border-r border-slate-100">{r.stativ || r.manzil || r.object || '—'}</td>
                      <td className="p-3 text-center border-r border-slate-100">{r.last_check || '—'}</td>
                      <td className="p-3 text-center font-bold border-r border-slate-100">{r.next_check || '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${meta.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
