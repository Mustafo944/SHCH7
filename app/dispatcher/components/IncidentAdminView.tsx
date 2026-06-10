import React, { useState, useMemo } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, Edit, FileText, Plus, Trash2 } from 'lucide-react'
import { Incident } from '@/types'

const UZ_MONTHS_MAP: Record<string, string> = {
  '01': 'Yanvar', '02': 'Fevral', '03': 'Mart', '04': 'Aprel',
  '05': 'May', '06': 'Iyun', '07': 'Iyul', '08': 'Avgust',
  '09': 'Sentabr', '10': 'Oktabr', '11': 'Noyabr', '12': 'Dekabr'
}
function formatMonthUz(ms: string) {
  const [y, m] = ms.split('-')
  return `${UZ_MONTHS_MAP[m] || m} ${y}`
}
function formatDateUz(ds: string) {
  const d = new Date(ds)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function IncidentAdminView({ incidents, onAdd, onDelete }: { incidents: Incident[], onAdd: (month: string, content: string) => Promise<void>, onDelete: (id: string) => void }) {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const UZ_MONTH_NAMES = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

  const selectedMonthValue = selectedMonthIdx !== null
    ? `${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMonthValue || !content.trim()) return
    setLoading(true)
    await onAdd(selectedMonthValue, content)
    setSelectedMonthIdx(null)
    setContent('')
    setLoading(false)
  }

  const grouped = useMemo(() => {
    const groups: Record<string, Incident[]> = {}
    incidents.forEach(inc => {
      if (!groups[inc.month]) groups[inc.month] = []
      groups[inc.month].push(inc)
    })
    return groups
  }, [incidents])

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="premium-card p-6 sm:p-8">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <AlertTriangle className="text-red-500" /> Yangi Baxtsiz Hodisa Qo&apos;shish
        </h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Oyni tanlang</label>
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => setSelectedYear(y => y - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-purple-50 hover:text-purple-600 transition-colors shadow-sm">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-black text-slate-900 min-w-[60px] text-center">{selectedYear}</span>
              <button type="button" onClick={() => setSelectedYear(y => y + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-purple-50 hover:text-purple-600 transition-colors shadow-sm rotate-180">
                <ChevronLeft size={16} />
              </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {UZ_MONTH_NAMES.map((m, i) => {
                const isSelected = selectedMonthIdx === i
                const isCurrent = i === now.getMonth() && selectedYear === now.getFullYear()
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonthIdx(i)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/20 scale-[1.05]'
                        : isCurrent
                          ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                          : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50 hover:border-purple-200 hover:text-purple-600'
                    }`}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
            {selectedMonthValue && (
              <p className="mt-2.5 text-xs font-bold text-purple-600">✓ Tanlangan: {formatMonthUz(selectedMonthValue)}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Mazmuni</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="input-premium min-h-[120px] resize-y w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-500/50 focus:bg-white"
              placeholder="Baxtsiz hodisa tafsilotlarini kiriting..."
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !selectedMonthValue}
              className="btn-gradient flex items-center gap-2 disabled:opacity-40 rounded-xl px-10 py-4 text-sm font-black text-white shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <Plus size={18} />}
              <span>Saqlash</span>
            </button>
          </div>
        </form>
      </div>
      <IncidentMonthList grouped={grouped} onDelete={onDelete} />
    </div>
  )
}

function IncidentMonthList({ grouped, onDelete }: { grouped: Record<string, Incident[]>, onDelete: (id: string) => void }) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  const allYears = useMemo(() => {
    const years = new Set<number>()
    years.add(new Date().getFullYear())
    Object.keys(grouped).forEach(m => {
      const y = parseInt(m.split('-')[0], 10)
      if (!isNaN(y)) years.add(y)
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [grouped])

  const UZ_FULL_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
        <FileText className="text-purple-500" /> Barcha Baxtsiz Hodisalar
      </h3>

      {allYears.map(year => (
        <div key={year}>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">📅 {year}-yil</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
            {UZ_FULL_MONTHS.map((mName, i) => {
              const key = `${year}-${String(i + 1).padStart(2, '0')}`
              const items = grouped[key] || []
              const count = items.length
              const isExpanded = expandedMonth === key
              const hasItems = count > 0
              const isCurrent = i === new Date().getMonth() && year === new Date().getFullYear()

              return (
                <button
                  key={key}
                  onClick={() => setExpandedMonth(isExpanded ? null : key)}
                  className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all text-center cursor-pointer ${
                    isExpanded
                      ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/20 scale-[1.03]'
                      : hasItems
                        ? 'bg-white border-slate-200/60 hover:border-purple-300 hover:shadow-md'
                        : isCurrent
                          ? 'bg-purple-50/50 border-purple-100 hover:border-purple-200'
                          : 'bg-slate-50/50 border-slate-100 hover:border-slate-200 hover:bg-white/80'
                  }`}
                >
                  <span className={`text-xs font-black uppercase tracking-wider ${
                    isExpanded ? 'text-white/70' : hasItems ? 'text-slate-400' : 'text-slate-300'
                  }`}>
                    {mName.slice(0, 3)}
                  </span>
                  {hasItems ? (
                    <span className={`mt-1 text-lg font-black ${isExpanded ? 'text-white' : 'text-red-500'}`}>
                      {count}
                    </span>
                  ) : (
                    <span className={`mt-1 text-lg font-black ${isExpanded ? 'text-white/50' : 'text-slate-200'}`}>—</span>
                  )}
                </button>
              )
            })}
          </div>

          {expandedMonth && expandedMonth.startsWith(String(year)) && (
            <div className="premium-card p-5 sm:p-6 animate-fade-up mb-4">
              <h4 className="text-base sm:text-lg font-black text-slate-900 mb-4 flex items-center justify-between border-b border-purple-100/50 pb-3">
                <span>📋 {formatMonthUz(expandedMonth)}</span>
                {(grouped[expandedMonth]?.length || 0) > 0 && (
                  <span className="badge-danger">{grouped[expandedMonth].length} ta hodisa</span>
                )}
              </h4>
              {(grouped[expandedMonth]?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {grouped[expandedMonth].map(inc => (
                    <div key={inc.id} className="relative rounded-2xl border border-red-100 bg-red-50/30 p-4 sm:p-5">
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={() => onDelete(inc.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-red-400 shadow-sm border border-red-100 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="pr-12">
                        <p className="text-xs font-bold text-slate-500 mb-2">{formatDateUz(inc.createdAt)}</p>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed break-words overflow-hidden">{inc.content}</p>
                        <p className="text-[10px] font-black text-slate-400 mt-3 flex items-center gap-1"><Edit size={10} /> {inc.createdByName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-300 mb-3" />
                  <p className="text-sm font-bold text-slate-400">Baxtsiz hodisa qayd qilinmagan</p>
                  <p className="text-xs text-slate-300 mt-1">{formatMonthUz(expandedMonth)} oyida hodisa sodir bo&apos;lmagan</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
