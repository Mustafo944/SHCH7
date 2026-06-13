import React, { useState, useMemo } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, X, BookOpen, AlertTriangle, Download } from 'lucide-react'
import { ReportEntry } from '@/types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function TodayTasksModal({ type, tasks, onClose }: {
  type: 'bugunReja' | 'qolibKetgan' | 'sababliBajarilmagan'
  tasks: { stationId: string; stationName: string; workerName: string; entry: ReportEntry; month: string; taskText: string; type: string; reason?: string | null; completedDate?: string | null }[]
  onClose: () => void
}) {
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

  let title = ''
  let headerColor = ''
  let titleColor = ''

  if (type === 'bugunReja') {
    title = 'BUGUNGI ISHLAR RO\'YXATI'
    headerColor = 'bg-blue-50/50 border-blue-100'
    titleColor = 'text-blue-900'
  } else if (type === 'qolibKetgan') {
    title = 'Bajarilmagan ishlar (Izoxsiz)'
    headerColor = 'bg-red-50/50 border-red-100'
    titleColor = 'text-red-900'
  } else {
    title = 'Sababli bajarilmagan ishlar (Arxiv)'
    headerColor = 'bg-orange-50/50 border-orange-100'
    titleColor = 'text-orange-900'
  }

  const downloadPDF = () => {
    const doc = new jsPDF()
    doc.setFont("helvetica", "normal")
    doc.setFontSize(14)
    doc.text(`Sababli bajarilmagan ishlar xisoboti (Barcha bekatlar)`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Sana: ${todayFormatted}`, 14, 28)

    const tableData = tasks.map((t, i) => {
      let dateFormatted = t.entry.ragat
      if (t.entry.ragat && t.month && t.month.includes('-')) {
        const [yyyy, mm] = t.month.split('-')
        dateFormatted = `${String(t.entry.ragat.trim()).padStart(2, '0')}.${mm}.${yyyy}`
      }
      const status = t.completedDate ? 'Bajarilgan ✅' : 'Bajarilmagan ❌'
      
      return [
        i + 1,
        t.stationName,
        dateFormatted,
        t.taskText,
        t.reason || '',
        status
      ]
    })

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Bekat', 'Sana', 'Ish nomi', 'Sabab (Izox)', 'Holati']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [249, 115, 22] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 55 },
        4: { cellWidth: 55 },
        5: { cellWidth: 25 }
      }
    })

    doc.save(`Sababli_bajarilmagan_dispetcher_${todayDate.getTime()}.pdf`)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl animate-scale-in">
        
        {/* HEADER */}
        <div className={`flex items-center justify-between border-b px-6 sm:px-8 py-5 sm:py-6 ${headerColor}`}>
          <div>
            <h3 className={`text-lg sm:text-xl font-black tracking-tight ${titleColor}`}>
              {title}
            </h3>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                {todayFormatted} · {tasks.length} ta ish · {stationEntries.length} ta bekat
              </p>
              {type === 'sababliBajarilmagan' && tasks.length > 0 && (
                <button onClick={downloadPDF} className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-md hover:bg-orange-200 transition-colors">
                  <Download size={14} /> Yuklash (PDF)
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-2.5 sm:p-3 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
          {tasks.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300`}>
                  {type === 'bugunReja' ? <CheckCircle2 size={32} /> : type === 'sababliBajarilmagan' ? <BookOpen size={32} /> : <AlertTriangle size={32} />}
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  Bu ro'yxatda ishlar yo'q
                </p>
              </div>
            </div>
          ) : expandedStation === null ? (
            <div className="p-4 sm:p-6 space-y-2">
              {stationEntries.map(([stationId, { stationName, workerName, items }]) => (
                <button
                  key={stationId}
                  onClick={() => setExpandedStation(stationId)}
                  className={`w-full flex items-center justify-between rounded-2xl border p-4 sm:p-5 transition-all hover:shadow-md active:scale-[0.98] group bg-white border-slate-200 hover:bg-slate-50`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl text-sm sm:text-base font-black shadow-sm bg-slate-100 text-slate-600 border border-slate-200`}>
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
              <div className={`sticky top-0 z-10 flex items-center gap-3 border-b px-4 sm:px-6 py-3 bg-white/80 backdrop-blur-sm border-slate-200`}>
                <button
                  onClick={() => setExpandedStation(null)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/80 border border-slate-200/60 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Bekatlar</span>
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black bg-slate-100 text-slate-600`}>
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
                  
                  const isCompletedAfter = !!task.completedDate

                  return (
                    <div key={ti} className="rounded-xl border p-4 sm:p-5 transition-colors bg-white border-slate-200 hover:bg-slate-50">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wide border ${isCompletedAfter ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {isCompletedAfter ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          Sana: {dateFormatted}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</p>
                      
                      {task.reason && (
                        <div className="mt-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100/50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-orange-800/50 mb-1">Izox:</p>
                          <p className="text-[11px] font-semibold text-orange-900 leading-relaxed">{task.reason}</p>
                        </div>
                      )}

                      {isCompletedAfter && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 rounded-md">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span className="text-[10px] font-black uppercase text-emerald-700">Kechikib bo'lsa ham bajarildi</span>
                        </div>
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
