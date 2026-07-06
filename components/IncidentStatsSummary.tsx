import type { Incident } from '@/types'
import { INCIDENT_SEVERITY_META, INCIDENT_SEVERITY_ORDER } from '@/lib/constants'

// Admin (Mehnat muhofazasi) va ishchi/dispetcher ro'yxati bir xil
// statistika ko'rinishidan foydalanishi uchun yagona manba shu yerda saqlanadi.
export function IncidentStatsSummary({ incidents }: { incidents: Incident[] }) {
  const total = incidents.length
  const uncategorized = incidents.filter(inc => !inc.severity).length

  return (
    <div className="rounded-[24px] border border-white/60 bg-white/40 backdrop-blur-md p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
      <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Umumiy statistika</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-[20px] border border-purple-100 bg-white p-4 shadow-[0_2px_10px_-3px_rgba(147,51,234,0.1)] transition-transform hover:-translate-y-0.5">
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-purple-600 mb-1">Jami</p>
          <p className="text-3xl sm:text-4xl font-black text-purple-700 leading-none">{total}</p>
        </div>
        {INCIDENT_SEVERITY_ORDER.map(sev => {
          const meta = INCIDENT_SEVERITY_META[sev]
          const count = incidents.filter(inc => inc.severity === sev).length
          return (
            <div key={sev} className={`rounded-[20px] border bg-white p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] transition-transform hover:-translate-y-0.5 ${meta.cardClass.replace(/bg-.*?(\s|$)/, '')}`}>
              <p className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1 ${meta.textClass}`}>{meta.label}</p>
              <p className={`text-3xl sm:text-4xl font-black leading-none ${meta.textClass}`}>{count}</p>
            </div>
          )
        })}
        {uncategorized > 0 && (
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 shadow-sm transition-transform hover:-translate-y-0.5">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Toifalanmagan</p>
            <p className="text-3xl sm:text-4xl font-black text-slate-500 leading-none">{uncategorized}</p>
          </div>
        )}
      </div>
    </div>
  )
}
