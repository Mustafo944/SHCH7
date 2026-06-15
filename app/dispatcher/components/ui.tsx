import React from 'react'

export function StatCard({ icon, label, value, active, clickable, onClick, color = 'purple', subtext }: {
  icon: React.ReactNode,
  label: string,
  value: string | number,
  active?: boolean,
  clickable?: boolean,
  onClick?: () => void,
  color?: 'purple' | 'blue' | 'emerald' | 'red' | 'amber',
  subtext?: React.ReactNode
}) {
  const styles: Record<string, { bg: string, border: string, iconBg: string, iconText: string, valueText: string }> = {
    purple: { bg: 'bg-white/30', border: 'border-white/60', iconBg: 'bg-gradient-to-br from-white/90 to-white/50', iconText: 'text-indigo-600', valueText: 'text-indigo-900' },
    blue: { bg: 'bg-white/30', border: 'border-white/60', iconBg: 'bg-gradient-to-br from-white/90 to-white/50', iconText: 'text-blue-600', valueText: 'text-blue-900' },
    emerald: { bg: 'bg-white/30', border: 'border-white/60', iconBg: 'bg-gradient-to-br from-white/90 to-white/50', iconText: 'text-emerald-600', valueText: 'text-emerald-900' },
    red: { bg: 'bg-white/30', border: 'border-white/60', iconBg: 'bg-gradient-to-br from-white/90 to-white/50', iconText: 'text-red-600', valueText: 'text-red-900' },
    amber: { bg: 'bg-white/30', border: 'border-white/60', iconBg: 'bg-gradient-to-br from-white/90 to-white/50', iconText: 'text-amber-600', valueText: 'text-amber-900' },
  }
  const s = styles[color]

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[32px] ${s.bg} p-5 sm:p-6 backdrop-blur-[40px] border ${s.border} shadow-[0_8px_32px_rgba(31,38,135,0.05)] transition-all ${clickable ? 'cursor-pointer hover:shadow-[0_8px_32px_rgba(31,38,135,0.15)] hover:bg-white/40 hover:border-white/80 active:scale-[0.98]' : ''} flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6`}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 z-20"></div>
      <div className={`relative z-10 flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl sm:rounded-[20px] ${s.iconBg} shadow-[0_4px_16px_rgba(0,0,0,0.05)] border ${s.border} ${s.iconText} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <div className="flex items-end gap-3 mt-0.5">
          <p className={`text-2xl sm:text-3xl font-black ${s.valueText}`}>{value}</p>
          {subtext && <div className="mb-1">{subtext}</div>}
        </div>
      </div>
      {active && <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-ping" />}
    </div>
  )
}

export function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-[20px] px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 shrink-0 ${active
        ? 'bg-white/50 border border-white/80 shadow-[0_8px_24px_rgba(31,38,135,0.1)] text-indigo-900 backdrop-blur-3xl'
        : 'text-slate-500 hover:text-indigo-700 hover:bg-white/30 backdrop-blur-xl border border-transparent'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export function BigActionCard({ title, desc, icon, onClick, count, color = 'purple' }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void, count?: number, color?: 'purple' | 'amber' | 'blue' | 'emerald' }) {
  const colorMap: Record<string, string> = {
    purple: 'text-indigo-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
  }
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center p-8 sm:p-10 bg-white/30 backdrop-blur-[40px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.07)] transition-all hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(31,38,135,0.15)] hover:border-white/80 hover:-translate-y-1 active:scale-[0.98] text-center overflow-hidden ${colorMap[color]}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 z-20"></div>
      {count !== undefined && count > 0 && (
        <div className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-sm font-black text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] z-30">
          {count > 9 ? '9+' : count}
        </div>
      )}
      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white/90 to-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white/60 mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_8px_24px_rgba(79,70,229,0.2)]">
        {icon}
      </div>
      <h3 className="relative z-10 text-lg sm:text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-900">{title}</h3>
      <p className="relative z-10 mt-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">{desc}</p>
    </button>
  )
}

export function FormGroup({ label, value, onChange, placeholder, type = 'text' }: { label: string, value: string, onChange: (val: string) => void, placeholder: string, type?: string }) {
  const [val, setVal] = React.useState(value)
  React.useEffect(() => setVal(value), [value])

  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
      <input
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if (val !== value) onChange(val) }}
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
