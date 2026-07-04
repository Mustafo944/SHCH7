import React, { useState, memo } from 'react'
import { CheckCircle2, Clock, ChevronRight, Download, XCircle, AlertTriangle } from 'lucide-react'
import { WorkReport, ReportEntry } from '@/types'
import { EmptyState } from './ui'

export const ReportList = memo(function ReportList({ reports, onConfirm, onConfirmRow: _onConfirmRow, onReject }: {
  reports: WorkReport[]
  onConfirm: (reportId: string) => void
  onConfirmRow: (reportId: string, idx: number) => void
  onReject: (reportId: string) => void
}) {
  if (reports.length === 0) return <EmptyState label="Hisobotlar yo'q" />
  return (
    <div className="space-y-4">
      {reports.slice().sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map((r) => (
        <ReportCard
          key={r.id}
          report={r}
          onConfirm={() => onConfirm(r.id)}
          onConfirmRow={(idx: number) => _onConfirmRow(r.id, idx)}
          onReject={() => onReject(r.id)}
        />
      ))}
    </div>
  )
})

/** NSH ma'lumotini entry matnidan parse qiladi */
export function _parseNshFromEntry(entry: ReportEntry): string {
  const text = entry.haftalikJadval || entry.yillikJadval || ''
  const match = text.match(/^\[([^\]]+)\]/)
  if (match) return match[1]
  if (text.length > 40) return text.slice(0, 40) + '...'
  return text || 'Boshqa'
}

export const ReportCard = memo(function ReportCard({ report, onConfirm, onConfirmRow: _onConfirmRow, onReject }: {
  report: WorkReport
  onConfirm: () => void
  onConfirmRow: (idx: number) => void
  onReject: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  // Rad etish tasdiqlash modali
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)

  const isRejected = !!report.rejectedAt
  const isPlanPending = !report.confirmedAt && !isRejected
  const isAccepted = !!report.confirmedAt
  
  // Faqat jadvallari bor yoki bajarilgan ishlar bor qatorlarni hisobga olamiz (bo'sh qatorlardagi tasodifiy bajarildi larni inkor etish uchun)
  const _validEntries = (report.entries || []).filter((e: ReportEntry) => 
    e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish || e.bajarildiShn
  )

  // Status belgisi va rangi
  const statusIcon = isRejected
    ? <XCircle size={24} />
    : isPlanPending
      ? <Clock size={24} />
      : <CheckCircle2 size={24} />

  const iconBg = isRejected
    ? 'bg-red-50 text-red-500'
    : isPlanPending
      ? 'bg-amber-50 text-amber-600'
      : 'bg-emerald-50 text-emerald-600'

  return (
    <div className={`premium-card overflow-hidden transition-all duration-300 ${expanded ? 'shadow-xl ring-1 ring-sky-400/20' : 'hover:bg-white/80 shadow-sm'} ${isRejected ? 'ring-1 ring-red-200/60' : ''}`}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex cursor-pointer items-center justify-between p-6"
      >
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ${iconBg}`}>
            {statusIcon}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">{report.workerName}</h3>
            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {report.month ? (() => { const [y, m] = report.month.split('-'); const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']; return `${months[parseInt(m, 10) - 1]} ${y}`; })() : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isRejected && (
            <span className="rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-[10px] font-black text-red-600 flex items-center gap-1">
              <XCircle size={10} /> RAD QILINGAN
            </span>
          )}
          {isPlanPending && <span className="badge-warning badge rounded-lg px-3 py-1 text-[10px] font-black">REJA KUTILMOQDA</span>}
          {isAccepted && (
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-black text-emerald-600">✓ QABUL QILINGAN</span>
          )}
          <ChevronRight className={`text-slate-300 transition-transform duration-200 ${expanded ? 'rotate-90 text-sky-500' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-6 pt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">Ishchi: <span className="font-bold text-slate-600">{report.workerName}</span></span>

            <div className="flex gap-2">
              {/* Qabul qilish tugmasi — faqat kutilmoqda yoki rad qilingan holatda */}
              {(isPlanPending || isRejected) && (
                <button
                  onClick={(e) => { e.stopPropagation(); onConfirm() }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
                >
                  <CheckCircle2 size={14} />
                  Rejani Qabul Qilish
                </button>
              )}

              {/* Rad etish tugmasi — faqat kutilmoqda holatda (qabul qilinmagan va rad qilinmagan) */}
              {isPlanPending && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowRejectConfirm(true) }}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
                >
                  <XCircle size={14} />
                  Rad Etish
                </button>
              )}

              {/* Yuklab olish tugmasi */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const printWindow = window.open('', '_blank')
                  if (!printWindow) return
                  const entriesHtml = (report.entries || [])
                    .filter((e: ReportEntry) => e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish)
                    .map((e: ReportEntry) => `
                      <tr>
                        <td style="text-align:center">${e.ragat || ''}</td>
                        <td>${e.haftalikJadval || ''}</td>
                        <td>${e.yillikJadval || ''}</td>
                        <td>${e.yangiIshlar || ''}</td>
                        <td>${e.kmoBartaraf || ''}</td>
                        <td>${e.majburiyOzgarish || ''}</td>
                        <td style="text-align:center">${e.bajarildiShn || ''}</td>
                        <td style="text-align:center">${e.bajarildiImzo || ''}</td>
                        <td style="text-align:center">${e.adImzosi || 'Kutilmoqda'}</td>
                      </tr>
                    `).join('')

                  printWindow.document.write(`
                    <html>
                    <head>
                      <title>${report.workerName} — ${report.month}</title>
                      <style>
                        body { font-family: sans-serif; font-size: 11px; color: #000; margin: 20px; }
                        h2 { font-size: 14px; margin-bottom: 4px; }
                        p { margin: 2px 0 12px; color: #555; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 10px; }
                        thead th { background: #f0f0f0; font-weight: bold; text-align: center; }
                        tr:nth-child(even) { background: #fafafa; }
                      </style>
                    </head>
                    <body>
                      <h2>${report.workerName}</h2>
                      <p>Bekat: ${report.stationName} &nbsp;|&nbsp; Oy: ${report.month}</p>
                      <table>
                        <thead>
                          <tr>
                            <th rowspan="2">№</th>
                            <th rowspan="2">4-haftalik jadval</th>
                            <th rowspan="2">Yillik jadval bo'yicha</th>
                            <th rowspan="2">Yangi ishlar ro'yxati</th>
                            <th rowspan="2">O'tkazilgan KMO va bartaraf etilgan kamchiliklar</th>
                            <th rowspan="2">Rejaga kiritilgan majburiy o'zgartirishlar</th>
                            <th colspan="2">Bajarilgan ishlar</th>
                            <th rowspan="2">AD imzosi</th>
                          </tr>
                          <tr>
                            <th>Shn</th>
                            <th>Imzo</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${entriesHtml}
                        </tbody>
                      </table>
                    </body>
                    </html>
                  `)
                  printWindow.document.close()
                  printWindow.print()
                }}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-sky-600 hover:border-sky-200 transition-all shadow-sm"
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          {/* Rad etish sababi ko'rsatish */}
          {isRejected && report.rejectedBy && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-red-700 mb-0.5">Oylik reja rad qilindi</p>
                <p className="text-[11px] text-red-600">
                  Rad etuvchi: <span className="font-bold">{report.rejectedBy}</span>
                  {report.rejectedAt && (
                    <span className="ml-2 text-red-400">
                      · {new Date(report.rejectedAt).toLocaleDateString('uz-UZ')}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-red-500 mt-1">Katta elektromexanik rejani qayta yuborishi kerak.</p>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 relative">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[11px] text-slate-700 min-w-[800px]">
                <thead className="border-b-2 border-sky-500/50 bg-slate-100 font-bold text-slate-600">
                  <tr>
                    <th rowSpan={2} className="w-8 border-r border-slate-200 p-2 text-center text-[10px]">№</th>
                    <th rowSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">4-haftalik jadval</th>
                    <th rowSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">Yillik jadval</th>
                    <th rowSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">Yangi ishlar</th>
                    <th rowSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">KMO bartaraf</th>
                    <th rowSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">Majburiy o'zgarish</th>
                    <th colSpan={2} className="border-r border-slate-200 p-2 text-center text-[10px]">Bajarilgan</th>
                    <th rowSpan={2} className="bg-amber-50 p-2 text-center text-[10px] text-amber-700">AD imzo</th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="border-r border-t border-slate-200 p-2 text-center text-[10px]">Shn</th>
                    <th className="border-r border-t border-slate-200 p-2 text-center text-[10px]">Imzo</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.entries || []).filter(e => e.haftalikJadval || e.yillikJadval || e.yangiIshlar || e.kmoBartaraf || e.majburiyOzgarish || e.bajarildiShn).map((e, idx) => {
                    const isLate = !!(e.completedAfterMissedDateHaftalik || e.completedAfterMissedDateYillik || e.completedAfterMissedDateYangi || e.completedAfterMissedDateKmo || e.completedAfterMissedDateMajburiy)
                    const lateDateStr = e.completedAfterMissedDateHaftalik || e.completedAfterMissedDateYillik || e.completedAfterMissedDateYangi || e.completedAfterMissedDateKmo || e.completedAfterMissedDateMajburiy
                    let formattedLateDate = ''
                    if (lateDateStr) {
                      const d = new Date(lateDateStr)
                      formattedLateDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
                    }

                    return (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-white transition-colors">
                        <td className="border-r border-slate-200 p-2 text-center font-bold text-slate-400">{e.ragat}</td>
                        <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap">{e.haftalikJadval || '—'}</td>
                        <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap">{e.yillikJadval || '—'}</td>
                        <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap">{e.yangiIshlar || '—'}</td>
                        <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap">{e.kmoBartaraf || '—'}</td>
                        <td className="border-r border-slate-200 p-2 align-top whitespace-pre-wrap">{e.majburiyOzgarish || '—'}</td>
                        <td className="border-r border-slate-200 p-2 text-center align-middle text-[10px] font-medium text-sky-600">{e.bajarildiShn || '—'}</td>
                        <td className="border-r border-slate-200 p-2 text-center align-middle text-[10px] italic text-slate-500">{e.bajarildiImzo || '—'}</td>
                        <td className="p-2 text-center align-middle">
                          {e.adImzosi ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold border ${isLate ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                <CheckCircle2 size={12} /> {e.adImzosi}
                              </span>
                              {isLate && formattedLateDate && (
                                <span className="text-[9px] font-bold text-orange-500">{formattedLateDate} da bajarildi</span>
                              )}
                            </div>
                          ) : (
                            <div className="text-[9px] italic text-slate-300">Kutilmoqda...</div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rad etish tasdiqlash modali */}
      {showRejectConfirm && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRejectConfirm(false) }}
        >
          <div className="animate-scale-in mx-4 w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl border border-red-100">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 mx-auto">
              <XCircle size={28} />
            </div>
            <h3 className="mb-2 text-center text-lg font-black text-slate-900">Oylik reja rad qilinsinmi?</h3>
            <p className="mb-6 text-center text-sm text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700">{report.workerName}</span> ning{' '}
              {report.month ? (() => {
                const [y, m] = report.month.split('-')
                const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']
                return `${months[parseInt(m, 10) - 1]} ${y}`
              })() : ''}{' '}
              oylik ish rejasi rad qilinadi. Katta elektromexanik rejani qayta yuborishi kerak bo'ladi.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  setShowRejectConfirm(false)
                  onReject()
                }}
                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
              >
                Rad Etish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
