import React, { useState, useEffect } from 'react'
import { FileText, BookOpen, Download } from 'lucide-react'
import { WorkReport, Station, StationJournal, DU46Entry, SHU2Entry } from '@/types'
import { getJournalsByStationId } from '@/lib/supabase-db'
import { MONTHS } from '@/lib/constants'
import { ReportCard } from './ReportList'
import { DU46JournalView, SHU2JournalView } from '@/components/JournalView'

export function ArchiveView({ stations, allReports, onConfirm, onConfirmEntry }: {
  stations: { id: string; name: string }[]
  allReports: WorkReport[]
  onConfirm: (reportId: string) => void
  onConfirmEntry: (reportId: string, idx: number) => void
}) {
  const [selStation, setSelStation] = useState<string | null>(null)
  const [selYear, setSelYear] = useState('2026')
  const [selMonth, setSelMonth] = useState<number | null>(null)
  const [archiveTab, setArchiveTab] = useState<'hisobot' | 'du46' | 'shu2'>('hisobot')
  const [viewJournal, setViewJournal] = useState<StationJournal | null>(null)

  const [stationJournals, setStationJournals] = useState<StationJournal[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [journalsLoading, setJournalsLoading] = useState(false)

  useEffect(() => {
    if (!selStation) { setStationJournals([]); return }
    setJournalsLoading(true)
    getJournalsByStationId(selStation)
      .then(setStationJournals)
      .finally(() => setJournalsLoading(false))
  }, [selStation])

  const archiveReports = selStation && selMonth !== null
    ? allReports.filter((r) => r.stationId === selStation && r.month === `${selYear}-${String(selMonth + 1).padStart(2, '0')}`)
    : []

  const du46Archive = selStation && selMonth !== null
    ? stationJournals.filter(j => j.journalType === 'du46' && j.updatedAt.startsWith(`${selYear}-${String(selMonth + 1).padStart(2, '0')}`))
    : []

  const shu2Archive = selStation && selMonth !== null
    ? stationJournals.filter(j => j.journalType === 'shu2' && j.updatedAt.startsWith(`${selYear}-${String(selMonth + 1).padStart(2, '0')}`))
    : []

  const selStationName = stations.find((s: Station) => s.id === selStation)?.name || ''

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[300px_1fr] animate-fade-up">
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Arxiv Bekatlari</h3>
          <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {stations.map((st) => (
              <button key={st.id} onClick={() => { setSelStation(st.id); setArchiveTab('hisobot') }} className={`premium-card p-4 text-left transition-all duration-200 ${selStation === st.id ? 'bg-amber-50 ring-1 ring-amber-400/30 text-slate-900 shadow-md' : 'hover:bg-white/80 text-slate-500'}`}>
                <span className="font-bold">{st.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          {selStation ? (
            <>
              <div className="premium-card p-6">
                <h2 className="text-2xl font-black text-slate-900">{selStationName} Arxiv</h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  {Array.from({ length: Math.max(3, new Date().getFullYear() - 2026 + 3) }, (_, i) => 2026 + i).map(y => (
                    <button key={y} onClick={() => setSelYear(y.toString())} className={`rounded-xl px-6 py-2 text-xs font-black transition-all duration-200 ${selYear === y.toString() ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{y} yil</button>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {MONTHS.map((m, i) => {
                    const hasReport = allReports.some((r) => r.stationId === selStation && r.month === `${selYear}-${String(i + 1).padStart(2, '0')}`)
                    const hasDU46 = stationJournals.some(j => j.journalType === 'du46' && j.updatedAt.startsWith(`${selYear}-${String(i + 1).padStart(2, '0')}`))
                    const hasSHU2 = stationJournals.some(j => j.journalType === 'shu2' && j.updatedAt.startsWith(`${selYear}-${String(i + 1).padStart(2, '0')}`))
                    const hasAny = hasReport || hasDU46 || hasSHU2
                    return (
                      <button key={i} onClick={() => setSelMonth(i)} className={`rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${selMonth === i ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xl' : hasAny ? 'bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100' : 'bg-slate-50 border border-slate-100 text-slate-300 hover:bg-slate-100'}`}>{m}</button>
                    )
                  })}
                </div>
              </div>

              {selMonth !== null && (
                <>
                  <div className="flex gap-1 rounded-full bg-white/60 backdrop-blur-sm p-1 sm:p-1.5 shadow-sm border border-white/40 w-fit max-w-full overflow-x-auto custom-scrollbar">
                    <button onClick={() => setArchiveTab('hisobot')} className={`rounded-full px-3 py-2 sm:px-5 sm:py-2.5 text-[9px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all whitespace-nowrap shrink-0 ${archiveTab === 'hisobot' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>
                      <span className="flex items-center gap-1.5 sm:gap-2"><FileText size={14} className="shrink-0" /> Hisobotlar</span>
                    </button>
                    <button onClick={() => setArchiveTab('du46')} className={`rounded-full px-3 py-2 sm:px-5 sm:py-2.5 text-[9px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all whitespace-nowrap shrink-0 ${archiveTab === 'du46' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>
                      <span className="flex items-center gap-1.5 sm:gap-2"><BookOpen size={14} className="shrink-0" /> DU-46</span>
                    </button>
                    <button onClick={() => setArchiveTab('shu2')} className={`rounded-full px-3 py-2 sm:px-5 sm:py-2.5 text-[9px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all whitespace-nowrap shrink-0 ${archiveTab === 'shu2' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>
                      <span className="flex items-center gap-1.5 sm:gap-2"><BookOpen size={14} className="shrink-0" /> SHU-2</span>
                    </button>
                  </div>

                  {archiveTab === 'hisobot' && (
                    <div className="space-y-4">
                      {archiveReports.length === 0
                        ? <div className="premium-card flex h-48 items-center justify-center text-slate-300 text-sm font-black uppercase tracking-widest">Bu oy uchun hisobot yo'q</div>
                        : archiveReports.map((r) => (
                          <ReportCard key={r.id} report={r} onConfirm={() => onConfirm(r.id)} onConfirmRow={(idx: number) => onConfirmEntry(r.id, idx)} />
                        ))
                      }
                    </div>
                  )}

                  {archiveTab === 'du46' && (
                    <div className="space-y-4">
                      {du46Archive.length === 0
                        ? <div className="premium-card flex h-48 items-center justify-center text-slate-300 text-sm font-black uppercase tracking-widest">Bu oy uchun DU-46 jurnali yo'q</div>
                        : du46Archive.map((j) => (
                          <button
                            key={j.id}
                            onClick={() => setViewJournal(j)}
                            className="w-full text-left premium-card p-6 hover:ring-2 hover:ring-sky-400/30 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-black text-slate-900">DU-46 Jurnali</h4>
                                <p className="text-xs text-slate-400">{selStationName}</p>
                              </div>
                              <span className="text-sm font-bold text-sky-600 group-hover:translate-x-1 transition-transform">Ko'rish →</span>
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  )}

                  {archiveTab === 'shu2' && (
                    <div className="space-y-4">
                      {shu2Archive.length === 0
                        ? <div className="premium-card flex h-48 items-center justify-center text-slate-300 text-sm font-black uppercase tracking-widest">Bu oy uchun SHU-2 jurnali yo'q</div>
                        : shu2Archive.map((j) => (
                          <button
                            key={j.id}
                            onClick={() => setViewJournal(j)}
                            className="w-full text-left premium-card p-6 hover:ring-2 hover:ring-amber-400/30 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-black text-slate-900">SHU-2 Jurnali</h4>
                                <p className="text-xs text-slate-400">{selStationName}</p>
                              </div>
                              <span className="text-sm font-bold text-amber-600 group-hover:translate-x-1 transition-transform">Ko'rish →</span>
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </>
              )}

              {selMonth === null && (
                <div className="premium-card flex h-64 items-center justify-center text-slate-300 text-sm font-black uppercase tracking-widest">Oyni tanlang</div>
              )}
            </>
          ) : (
            <div className="premium-card flex h-96 items-center justify-center text-slate-300 text-sm font-black uppercase tracking-widest">Bekat tanlang</div>
          )}
        </div>
      </div>

      {viewJournal && (
        <div className="fixed inset-0 z-[500] bg-slate-50">
          {viewJournal.journalType === 'du46' ? (
            <DU46JournalView
              stationId={viewJournal.stationId}
              stationName={selStationName}
              userName="Dispetcher"
              userRole="dispatcher"
              journalMonth={viewJournal.updatedAt.slice(0,7)}
              onClose={() => setViewJournal(null)}
            />
          ) : (
            <SHU2JournalView
              stationId={viewJournal.stationId}
              stationName={selStationName}
              userName="Dispetcher"
              userRole="dispatcher"
              journalMonth={viewJournal.updatedAt.slice(0,7)}
              onClose={() => setViewJournal(null)}
            />
          )}
        </div>
      )}
    </>
  )
}

export function JournalArchiveCard({ journal, type, stationName }: {
  journal: StationJournal
  type: 'du46' | 'shu2'
  stationName: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const entries = journal.entries as (DU46Entry | SHU2Entry)[]
  const updatedDate = new Date(journal.updatedAt)
  const dateStr = `${String(updatedDate.getDate()).padStart(2, '0')}.${String(updatedDate.getMonth() + 1).padStart(2, '0')}.${updatedDate.getFullYear()}`

  const du46Entries = entries as DU46Entry[]
  const shu2Entries = entries as SHU2Entry[]

  const qabulCount = type === 'du46'
    ? du46Entries.filter(e => e.dispetcherQabulQildi).length
    : shu2Entries.filter(e => e.dispetcherQabulQildi).length
  const yuborildiCount = type === 'du46'
    ? du46Entries.filter(e => e.yuborildi).length
    : shu2Entries.filter(e => e.yuborildi).length
  const filteredEntries = entries.filter(e => type === 'du46' ? (e as DU46Entry).kamchilik || (e as DU46Entry).bartarafInfo : (e as SHU2Entry).yozuv)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: type === 'du46' ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`${type === 'du46' ? 'DU-46' : 'SHU-2'} Jurnali - ${stationName}`, 14, 15)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Sana: ${dateStr}`, 14, 22)
      doc.text(`Yangilangan: ${journal.updatedBy}`, 14, 28)

      if (type === 'du46') {
        const headRows: any[] = [
          [
            { content: '№', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Oy va\nkun', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Soat va\ndaqiqa', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: "Ko'rik, tekshiruvlar tahlili,\ntopilgan kamchiliklar bayoni", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: "Tegishli xodimga\nxabar berilgan vaqt", colSpan: 3, styles: { halign: 'center' } },
            { content: "Tegishli xodimning nosozlik va buzilishlarni\nbartaraf etishga kelgan vaqti", colSpan: 3, styles: { halign: 'center' } },
            { content: "Aniqlangan nosozliklar va buzilishlarni bartaraf\nqilganligi vaqti va xodimning imzosi", colSpan: 3, styles: { halign: 'center' } }
          ],
          [
            { content: 'Oy/kun', styles: { halign: 'center' } },
            { content: 'Soat va daqiqa', styles: { halign: 'center' } },
            { content: 'Xabar berish\nusuli', styles: { halign: 'center' } },
            { content: 'Oy/kun', styles: { halign: 'center' } },
            { content: 'Soat va daqiqa', styles: { halign: 'center' } },
            { content: 'Bartaraf etishga kelgan\nxodimning imzosi', styles: { halign: 'center' } },
            { content: 'Oy/kun', styles: { halign: 'center' } },
            { content: 'Soat va daqiqa', styles: { halign: 'center' } },
            { content: 'Nosozliklar va buzilishlarning\ntafsiloti', styles: { halign: 'center' } }
          ]
        ]

        const tableRows = du46Entries
          .filter(e => e.kamchilik || e.bartarafInfo || e.oyKun1 || e.soatMinut1)
          .map((e, i) => {
            let col3 = e.kamchilik || ''
            if (e.kamchilikBajarildi) col3 += `\n\nBoshladi: ${e.kamchilikImzo}`
            if (e.approvalsCol3?.length) e.approvalsCol3.forEach(a => { col3 += `\n${a.role.replace('_', ' ')}: ${a.signedBy}` })
            if (e.kamchilikBBTasdiqladi) col3 += `\nNavbatchi: ${e.kamchilikBBImzo}`

            let col12 = e.bartarafInfo || ''
            if (e.bartarafBajarildi) col12 += `\n\nTugadi: ${e.bartarafImzo}`
            if (e.bartarafBBTasdiqladi) col12 += `\nNavbatchi: ${e.bartarafBBImzo}`

            return [
              e.nomber || String(i + 1),
              e.oyKun1 || '', e.soatMinut1 || '', col3,
              e.oyKun2 || '', e.soatMinut2 || '', e.xabarUsuli || '',
              e.oyKun3 || '', e.soatMinut3 || '', e.dspImzo || '',
              e.oyKun4 || '', e.soatMinut4 || '', col12
            ]
          })

        autoTable(doc, {
          head: headRows,
          body: tableRows,
          startY: 34,
          theme: 'grid',
          styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
          headStyles: { fillColor: [8, 23, 40], textColor: [255, 255, 255], fontSize: 5.5, fontStyle: 'bold', halign: 'center' },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          columnStyles: { 0: { halign: 'center', cellWidth: 8 } },
        })
      } else {
        const tableColumn = ['№', 'Sana', 'Yozuv', 'Imzo', 'Holat']
        const tableRows = shu2Entries
          .filter(e => e.yozuv)
          .map((e, i) => [
            e.nomber || String(i + 1),
            e.sana || '',
            e.yozuv || '',
            (e as SHU2Entry).tasdiqlandi ? ((e as SHU2Entry).tasdiqlaganImzo || (e as SHU2Entry).imzo) : '',
            (e as SHU2Entry).dispetcherQabulQildi ? 'Qabul' : (e as SHU2Entry).yuborildi ? 'Kutilmoqda' : 'Yangi'
          ])

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 34,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [245, 158, 11], fontSize: 7, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [255, 251, 235] },
        })
      }

      doc.save(`${type.toUpperCase()}_${stationName}_${dateStr.replace(/\./g, '-')}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="premium-card overflow-hidden">
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 ${type === 'du46' ? 'bg-sky-50/50' : 'bg-amber-50/50'}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${type === 'du46' ? 'bg-sky-100 text-sky-600' : 'bg-amber-100 text-amber-600'}`}>
            <BookOpen size={20} />
          </div>
          <div>
            <h4 className="font-black text-slate-900 tracking-tight">{type === 'du46' ? 'DU-46' : 'SHU-2'} Jurnali</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stationName} · {dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yangilangan</p>
            <p className="text-xs font-bold text-slate-600">{journal.updatedBy}</p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 ${type === 'du46' ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
          >
            <Download size={14} /> {downloading ? '...' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-6 py-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-sky-400" />
          <span className="text-xs font-bold text-slate-500">Jami yozuvlar: <span className="text-slate-900">{filteredEntries.length}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-bold text-slate-500">Qabul: <span className="text-slate-900">{qabulCount}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-xs font-bold text-slate-500">Yuborildi: <span className="text-slate-900">{yuborildiCount}</span></span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-xs font-bold text-sky-600 hover:text-sky-700 uppercase tracking-widest transition-colors"
        >
          {expanded ? 'Yig\'ish ▲' : `Kengaytish (${filteredEntries.length}) ▼`}
        </button>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          {type === 'du46' ? (
            <table className="w-full text-[10px]" style={{ minWidth: '1000px' }}>
              <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-200">
                <tr>
                  <th className="p-2.5 text-center border-r border-slate-100">№</th>
                  <th className="p-2.5 text-center border-r border-slate-100">Oy/kun</th>
                  <th className="p-2.5 text-center border-r border-slate-100">Soat</th>
                  <th className="p-2.5 text-left border-r border-slate-100">Kamchilik</th>
                  <th className="p-2.5 text-center border-r border-slate-100">Xabar usuli</th>
                  <th className="p-2.5 text-left border-r border-slate-100">Bartaraf info</th>
                  <th className="p-2.5 text-center">Holat</th>
                </tr>
              </thead>
              <tbody>
                {du46Entries.filter(e => e.kamchilik || e.bartarafInfo).map((e, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-50">{e.nomber || i + 1}</td>
                    <td className="p-2.5 text-center text-slate-600 border-r border-slate-50">{e.oyKun1 || '—'}</td>
                    <td className="p-2.5 text-center text-slate-600 border-r border-slate-50">{e.soatMinut1 || '—'}</td>
                    <td className="p-2.5 text-slate-700 border-r border-slate-50 max-w-[250px] whitespace-pre-wrap">{e.kamchilik || '—'}</td>
                    <td className="p-2.5 text-center text-slate-600 border-r border-slate-50">{e.xabarUsuli || '—'}</td>
                    <td className="p-2.5 text-slate-700 max-w-[250px] whitespace-pre-wrap">{e.bartarafInfo || '—'}</td>
                    <td className="p-2.5 text-center">
                      {(e as DU46Entry).dispetcherQabulQildi
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-600 border border-emerald-100">✓ Qabul</span>
                        : (e as DU46Entry).yuborildi
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-600 border border-amber-100">⏳ Kutilmoqda</span>
                          : <span className="text-[8px] font-bold text-slate-300">Yangi</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-[10px]" style={{ minWidth: '800px' }}>
              <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-200">
                <tr>
                  <th className="p-2.5 text-center border-r border-slate-100">№</th>
                  <th className="p-2.5 text-center border-r border-slate-100">Sana</th>
                  <th className="p-2.5 text-left border-r border-slate-100">Yozuv</th>
                  <th className="p-2.5 text-center border-r border-slate-100">Imzo</th>
                  <th className="p-2.5 text-center">Holat</th>
                </tr>
              </thead>
              <tbody>
                {shu2Entries.filter(e => e.yozuv).map((e, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-50">{e.nomber || i + 1}</td>
                    <td className="p-2.5 text-center text-slate-600 border-r border-slate-50">{e.sana || '—'}</td>
                    <td className="p-2.5 text-slate-700 border-r border-slate-50 max-w-[400px] whitespace-pre-wrap">{e.yozuv || '—'}</td>
                    <td className="p-2.5 text-center text-slate-500 border-r border-slate-50">{(e as SHU2Entry).tasdiqlandi ? ((e as SHU2Entry).tasdiqlaganImzo || (e as SHU2Entry).imzo) : '—'}</td>
                    <td className="p-2.5 text-center">
                      {(e as SHU2Entry).dispetcherQabulQildi
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-600 border border-emerald-100">✓ Qabul</span>
                        : (e as SHU2Entry).yuborildi
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-600 border border-amber-100">⏳ Kutilmoqda</span>
                          : <span className="text-[8px] font-bold text-slate-300">Yangi</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filteredEntries.length === 0 && (
            <div className="py-12 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Bu oyda ma'lumot yo'q</div>
          )}
        </div>
      )}

      {!expanded && (
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-slate-400">To'liq ko'rish uchun <span className="font-bold text-sky-600">"Kengaytish"</span> tugmasini bosing</p>
        </div>
      )}
    </div>
  )
}
