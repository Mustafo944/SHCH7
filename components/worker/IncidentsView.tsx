import { useState, useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import type { Incident } from '@/types'

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
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export function IncidentsView({
  incidents,
  readIds,
  workerId,
  onRead
}: {
  incidents: Incident[]
  readIds: Set<string>
  workerId: string
  onRead: () => Promise<void>
}) {
  const [marking, setMarking] = useState<string | null>(null)

  const handleMarkRead = async (id: string) => {
    if (marking || readIds.has(id)) return
    setMarking(id)
    try {
      const { markIncidentAsRead } = await import('@/lib/supabase-db')
      await markIncidentAsRead(id, workerId)
      await onRead()
    } catch (err) {
      console.error(err)
    } finally {
      setMarking(null)
    }
  }

  // Guruhlash oyma-oy
  const grouped = useMemo(() => {
    const groups: Record<string, Incident[]> = {}
    incidents.forEach(inc => {
      if (!groups[inc.month]) groups[inc.month] = []
      groups[inc.month].push(inc)
    })
    return groups
  }, [incidents])

  // Yillarni aniqlash
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
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  return (
    <div className="space-y-6 animate-fade-up w-full mx-auto max-w-4xl">
      <div className="flex items-center gap-4 border-b border-slate-200/60 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" />
            Baxtsiz Hodisalar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Barcha sodir bo&apos;lgan hodisalar bilan tanishing</p>
        </div>
      </div>

      {allYears.map(year => (
        <div key={year}>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">📅 {year}-yil</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
            {UZ_FULL_MONTHS.map((mName, i) => {
              const key = `${year}-${String(i + 1).padStart(2, '0')}`
              const items = grouped[key] || []
              const count = items.length
              const unread = items.filter(it => !readIds.has(it.id)).length
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
                        ? 'bg-white/80 border-slate-200/60 hover:border-purple-300 hover:shadow-md'
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
                    <span className={`mt-1 text-lg font-black ${isExpanded ? 'text-white' : 'text-amber-500'}`}>
                      {count}
                    </span>
                  ) : (
                    <span className={`mt-1 text-lg font-black ${isExpanded ? 'text-white/50' : 'text-slate-200'}`}>—</span>
                  )}
                  {unread > 0 && !isExpanded && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-sm">
                      +{unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {expandedMonth && expandedMonth.startsWith(String(year)) && (
            <div className="premium-card p-5 sm:p-6 bg-white/80 animate-fade-up mb-4">
              <h3 className="text-base sm:text-lg font-black text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                <span>📋 {formatMonthUz(expandedMonth)}</span>
                {(() => {
                  const items = grouped[expandedMonth] || []
                  const unread = items.filter(it => !readIds.has(it.id)).length
                  return unread > 0 ? <span className="badge-danger">{unread} ta o&apos;qilmagan</span> : null
                })()}
              </h3>
              {(grouped[expandedMonth]?.length || 0) > 0 ? (
                <div className="space-y-4">
                  {grouped[expandedMonth].map(inc => {
                    const isRead = readIds.has(inc.id)
                    const isMarking = marking === inc.id

                    return (
                      <div
                        key={inc.id}
                        className={`relative rounded-2xl border p-4 sm:p-5 transition-colors ${
                          isRead
                            ? 'border-emerald-100 bg-emerald-50/20'
                            : 'border-amber-100 bg-amber-50/30 hover:bg-amber-50/50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                            <Clock size={12} />
                            {formatDateUz(inc.createdAt)}
                          </p>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${
                            isRead ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {isRead ? 'Tanishilgan' : 'Yangi'}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base text-slate-800 whitespace-pre-wrap leading-relaxed mb-4 break-words overflow-hidden">
                          {inc.content}
                        </p>

                        <div className="flex items-center justify-between mt-4 border-t border-slate-100/50 pt-3">
                          <p className="text-[10px] font-bold text-slate-400">
                            Kiritdi: <span className="text-slate-600">{inc.createdByName}</span>
                          </p>

                          {!isRead ? (
                            <button
                              onClick={() => handleMarkRead(inc.id)}
                              disabled={isMarking}
                              className="btn-gradient flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm active:scale-95 disabled:opacity-50"
                            >
                              {isMarking ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                              ) : (
                                <CheckCircle2 size={16} />
                              )}
                              <span>Tanishdim</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold">
                              <CheckCircle2 size={14} />
                              <span>Tanishilgan</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
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
