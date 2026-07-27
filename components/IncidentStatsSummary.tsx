import type { Incident, IncidentSeverity } from '@/types'
import { INCIDENT_SEVERITY_META, INCIDENT_SEVERITY_ORDER } from '@/lib/constants'

// Statistika kartasi bosilganda tanlanadigan filtr — biror og'irlik darajasi
// yoki "toifalanmagan". null = filtr yo'q (barcha hodisalar).
export type IncidentSeverityFilter = IncidentSeverity | 'uncategorized'

// Admin (Mehnat muhofazasi) va ishchi/dispetcher ro'yxati bir xil
// statistika ko'rinishidan foydalanishi uchun yagona manba shu yerda saqlanadi.
// onSelectSeverity berilsa — kartalar bosiladigan filtr tugmalariga aylanadi.
export function IncidentStatsSummary({
  incidents,
  activeSeverity = null,
  onSelectSeverity,
}: {
  incidents: Incident[]
  activeSeverity?: IncidentSeverityFilter | null
  onSelectSeverity?: (sev: IncidentSeverityFilter | null) => void
}) {
  const total = incidents.length
  const uncategorized = incidents.filter(inc => !inc.severity).length
  const interactive = !!onSelectSeverity

  // Aktiv karta halqasi rangi — literal klasslar (Tailwind JIT dinamik
  // yasалganini ko'rmaydi, shuning uchun har birini to'liq yozamiz)
  const RING_BY_SEVERITY: Record<IncidentSeverity, string> = {
    olim: 'ring-slate-900',
    ogir: 'ring-red-500',
    orta_ogir: 'ring-orange-500',
    yengil: 'ring-amber-400',
  }

  return (
    <div className="rounded-[24px] border border-white/60 bg-white/40 backdrop-blur-md p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Umumiy statistika</p>
        {interactive && activeSeverity && (
          <button
            onClick={() => onSelectSeverity?.(null)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            ✕ Filtrni tozalash
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Jami — bosilsa filtr tozalanadi (barchasi ko'rsatiladi) */}
        {(() => {
          const isActive = interactive && activeSeverity === null
          const base = `rounded-[20px] border bg-white p-4 text-left shadow-[0_2px_10px_-3px_rgba(147,51,234,0.1)] transition-all ${interactive ? 'cursor-pointer hover:-translate-y-0.5' : ''} ${isActive ? 'border-purple-300 ring-2 ring-offset-1 ring-purple-400' : 'border-purple-100'}`
          const inner = (
            <>
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-purple-600 mb-1">Jami</p>
              <p className="text-3xl sm:text-4xl font-black text-purple-700 leading-none">{total}</p>
            </>
          )
          return interactive
            ? <button type="button" onClick={() => onSelectSeverity?.(null)} className={base}>{inner}</button>
            : <div className={base}>{inner}</div>
        })()}

        {INCIDENT_SEVERITY_ORDER.map(sev => {
          const meta = INCIDENT_SEVERITY_META[sev]
          const count = incidents.filter(inc => inc.severity === sev).length
          const isActive = interactive && activeSeverity === sev
          const base = `rounded-[20px] border bg-white p-4 text-left shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] transition-all ${interactive ? 'cursor-pointer hover:-translate-y-0.5' : ''} ${meta.cardClass.replace(/bg-.*?(\s|$)/, '')} ${isActive ? `ring-2 ring-offset-1 ${RING_BY_SEVERITY[sev]}` : ''}`
          const inner = (
            <>
              <p className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1 ${meta.textClass}`}>{meta.label}</p>
              <p className={`text-3xl sm:text-4xl font-black leading-none ${meta.textClass}`}>{count}</p>
            </>
          )
          return interactive
            ? <button key={sev} type="button" onClick={() => onSelectSeverity?.(isActive ? null : sev)} className={base}>{inner}</button>
            : <div key={sev} className={base}>{inner}</div>
        })}

        {uncategorized > 0 && (() => {
          const isActive = interactive && activeSeverity === 'uncategorized'
          const base = `rounded-[20px] border bg-slate-50 p-4 text-left shadow-sm transition-all ${interactive ? 'cursor-pointer hover:-translate-y-0.5' : ''} ${isActive ? 'border-slate-400 ring-2 ring-offset-1 ring-slate-400' : 'border-slate-200'}`
          const inner = (
            <>
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Toifalanmagan</p>
              <p className="text-3xl sm:text-4xl font-black text-slate-500 leading-none">{uncategorized}</p>
            </>
          )
          return interactive
            ? <button type="button" onClick={() => onSelectSeverity?.(isActive ? null : 'uncategorized')} className={base}>{inner}</button>
            : <div className={base}>{inner}</div>
        })()}
      </div>
    </div>
  )
}
