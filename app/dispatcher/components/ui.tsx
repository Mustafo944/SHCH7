import React from 'react'

export function StatCard({ icon, label, value, active, clickable, onClick, color = 'purple' }: {
  icon: React.ReactNode,
  label: string,
  value: string | number,
  active?: boolean,
  clickable?: boolean,
  onClick?: () => void,
  color?: 'purple' | 'blue' | 'emerald' | 'red' | 'amber'
}) {
  const styles: Record<string, { bg: string, border: string, iconBg: string, iconText: string, valueText: string }> = {
    purple: { bg: 'bg-purple-50/50', border: 'border-purple-100/60', iconBg: 'bg-white', iconText: 'text-purple-500', valueText: 'text-purple-600' },
    blue: { bg: 'bg-blue-50/50', border: 'border-blue-100/60', iconBg: 'bg-white', iconText: 'text-blue-500', valueText: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-100/60', iconBg: 'bg-white', iconText: 'text-emerald-500', valueText: 'text-emerald-600' },
    red: { bg: 'bg-red-50/50', border: 'border-red-100/60', iconBg: 'bg-white', iconText: 'text-red-500', valueText: 'text-red-600' },
    amber: { bg: 'bg-amber-50/50', border: 'border-amber-100/60', iconBg: 'bg-white', iconText: 'text-amber-500', valueText: 'text-amber-600' },
  }
  const s = styles[color]

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[20px] ${s.bg} p-3 sm:p-5 border ${s.border} transition-all ${clickable ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''} flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4`}
    >
      <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl ${s.iconBg} shadow-sm border ${s.border} ${s.iconText} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className={`text-xl sm:text-2xl font-black ${s.valueText} mt-0.5`}>{value}</p>
      </div>
      {active && <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.3)] animate-ping" />}
    </div>
  )
}

export function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-[16px] px-3 py-2 sm:px-5 sm:py-3 text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${active
        ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-lg shadow-purple-500/25'
        : 'text-slate-500 hover:text-purple-700 hover:bg-white/60'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export function BigActionCard({ title, desc, icon, onClick, count, color = 'purple' }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void, count?: number, color?: 'purple' | 'amber' | 'blue' | 'emerald' }) {
  const colorMap: Record<string, string> = {
    purple: 'from-purple-50 hover:border-purple-300 text-purple-600',
    amber: 'from-amber-50 hover:border-amber-300 text-amber-600',
    blue: 'from-blue-50 hover:border-blue-300 text-blue-600',
    emerald: 'from-emerald-50 hover:border-emerald-300 text-emerald-600',
  }
  return (
    <button
      onClick={onClick}
      className={`premium-card group relative flex flex-col items-center justify-center p-10 bg-gradient-to-br to-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] text-center ${colorMap[color]}`}
    >
      {count !== undefined && count > 0 && (
        <div className="absolute -top-4 -right-4 flex h-10 w-10 animate-bounce items-center justify-center rounded-full bg-red-500 text-lg font-black text-white shadow-xl shadow-red-500/40 z-10">
          +{count}
        </div>
      )}
      <div className="rounded-2xl bg-purple-50/80 p-5 mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-white inline-flex shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{desc}</p>
    </button>
  )
}

export function FormGroup({ label, value, onChange, placeholder, type = 'text' }: { label: string, value: string, onChange: (val: string) => void, placeholder: string, type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-500/50 focus:bg-white"
      />
    </div>
  )
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="premium-card flex h-48 items-center justify-center text-slate-300 text-xs font-black uppercase tracking-widest">{label}</div>
  )
}
