import React, { useState, useMemo } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { ReportEntry } from '@/types'

export function TodayTasksModal({ type, tasks, onClose }: {
  type: 'bajarilgan' | 'bajarilmagan'
  tasks: { stationId: string; stationName: string; workerName: string; entry: ReportEntry; bajarilgan: boolean; month: string; taskText: string }[]
  onClose: () => void
}) {
  const isBajarilgan = type === 'bajarilgan'
  const [expandedStation, setExpandedStation] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map: Record<string, { stationName: string; workerName: string; items: typeof tasks }> = {}
    tasks.forEach(t => {
      if (!map[t.stationId]) map[t.stationId] = { stationName: t.stationName, workerName: t.workerName, items: [] }
      map[t.stationId].items.push(t)
    })
    return map
  }, [tasks])

  const stationEntries = Object.entries(grouped)
  const todayDate = new Date()
  const todayFormatted = `${String(todayDate.getDate()).padStart(2, '0')}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${todayDate.getFullYear()}`

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl animate-scale-in">
        <div className={`flex items-center justify-between border-b px-6 sm:px-8 py-5 sm:py-6 ${isBajarilgan
          ? 'border-emerald-100 bg-emerald-50/50'
          : 'border-red-100 bg-red-50/50'
          }`}>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {isBajarilgan ? 'Bugun bajarilgan ishlar' : 'Bugun bajarilmagan ishlar'}
            </h3>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {todayFormatted} · {tasks.length} ta ish · {stationEntries.length} ta bekat
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-2.5 sm:p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
          {tasks.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isBajarilgan ? 'bg-emerald-50 text-emerald-400' : 'bg-slate-100 text-slate-300'
                  }`}>
                  {isBajarilgan ? <CheckCircle2 size={32} /> : <Clock size={32} />}
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  {isBajarilgan ? 'Bugun hali bajarilgan ish yo\'q' : 'Barcha ishlar bajarilgan!'}
                </p>
              </div>
            </div>
          ) : expandedStation === null ? (
            <div className="p-4 sm:p-6 space-y-2">
              {stationEntries.map(([stationId, { stationName, workerName, items }]) => (
                <button
                  key={stationId}
                  onClick={() => setExpandedStation(stationId)}
                  className={`w-full flex items-center justify-between rounded-2xl border p-4 sm:p-5 transition-all hover:shadow-md active:scale-[0.98] group ${isBajarilgan
                    ? 'border-emerald-100 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                    : 'border-red-100 bg-white hover:border-red-300 hover:bg-red-50/30'
                    }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl text-sm sm:text-base font-black shadow-sm ${isBajarilgan
                      ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                      : 'bg-red-100 text-red-600 border border-red-200'
                      }`}>
                      +{items.length}
                    </div>
                    <div className="text-left min-w-0">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">{stationName}</h4>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 truncate">{workerName}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div>
              <div className={`sticky top-0 z-10 flex items-center gap-3 border-b px-4 sm:px-6 py-3 ${isBajarilgan ? 'border-emerald-100 bg-emerald-50/80' : 'border-red-100 bg-red-50/80'
                } backdrop-blur-sm`}>
                <button
                  onClick={() => setExpandedStation(null)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/80 border border-slate-200/60 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Bekatlar</span>
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${isBajarilgan ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    }`}>
                    {grouped[expandedStation]?.items.length}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-900 truncate">{grouped[expandedStation]?.stationName}</h4>
                    <p className="text-[9px] font-bold text-slate-400 truncate">{grouped[expandedStation]?.workerName}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-5 space-y-2.5">
                {grouped[expandedStation]?.items.map((task, ti) => {
                  const text = task.taskText || ''
                  let dateFormatted = task.entry.ragat
                  if (task.entry.ragat && task.month && task.month.includes('-')) {
                    const [yyyy, mm] = task.month.split('-')
                    dateFormatted = `${String(task.entry.ragat.trim()).padStart(2, '0')}.${mm}.${yyyy}`
                  }

                  return (
                    <div key={ti} className={`rounded-xl border p-3 sm:p-4 transition-colors ${isBajarilgan ? 'border-emerald-100 bg-white hover:bg-emerald-50/20' : 'border-red-100 bg-white hover:bg-red-50/20'
                      }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wide border ${isBajarilgan
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-red-50 text-red-600 border-red-100'
                          }`}>
                          {isBajarilgan ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {isBajarilgan ? dateFormatted : `${dateFormatted} gacha`}
                        </span>
                        {isBajarilgan && task.entry.bajarildiShn && (
                          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-500 truncate">
                            ✓ {task.entry.bajarildiShn}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-[13px] font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</p>
                      {!isBajarilgan && (
                        <p className="mt-2 flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-red-400">
                          <Clock size={10} /> Muddati o'tgan — bajarilmagan
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
