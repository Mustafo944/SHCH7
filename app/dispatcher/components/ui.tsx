import React, { memo } from 'react'

export const StatCard = memo(function StatCard({ icon, label, value, active, clickable, onClick, color = 'purple', subtext }: {
  icon: React.ReactNode,
  label: string,
  value: string | number,
  active?: boolean,
  clickable?: boolean,
  onClick?: () => void,
  color?: 'purple' | 'blue' | 'emerald' | 'red' | 'amber',
  subtext?: React.ReactNode
}) {
  const styles: Record<string, { iconBg: string, iconColor: string, borderColor: string, glowColor: string }> = {
    purple: { iconBg: 'bg-indigo-50/80', iconColor: 'text-indigo-500', borderColor: 'bg-indigo-500', glowColor: 'bg-indigo-400' },
    blue: { iconBg: 'bg-blue-50/80', iconColor: 'text-blue-600', borderColor: 'bg-blue-500', glowColor: 'bg-blue-400' },
    emerald: { iconBg: 'bg-emerald-50/80', iconColor: 'text-emerald-600', borderColor: 'bg-emerald-500', glowColor: 'bg-emerald-400' },
    red: { iconBg: 'bg-red-50/80', iconColor: 'text-red-600', borderColor: 'bg-red-500', glowColor: 'bg-red-400' },
    amber: { iconBg: 'bg-amber-50/80', iconColor: 'text-amber-600', borderColor: 'bg-amber-500', glowColor: 'bg-amber-400' },
  }
  const s = styles[color]

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[32px] bg-white/[0.25] backdrop-blur-3xl p-5 sm:p-6 shadow-sm border border-white/60 transition-all duration-300 ${clickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:bg-white/40 active:scale-[0.98]' : ''} flex items-center gap-5`}
    >
      <div className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${s.iconBg} ${s.iconColor} shadow-sm transition-transform duration-300 ${clickable ? 'group-hover:scale-110 group-hover:rotate-3' : ''}`}>
        {icon}
      </div>
      <div className="flex flex-col flex-1 relative z-10">
        <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <div className="mt-1 flex items-center gap-3">
          <p className={`text-3xl sm:text-4xl font-black ${s.iconColor} leading-none tracking-tight`}>{value}</p>
          {subtext && <div>{subtext}</div>}
        </div>
      </div>
      {active && <div className="absolute top-5 right-5 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />}
    </div>
  )
})

export const TabButton = memo(function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 sm:gap-3 rounded-full px-4 py-2.5 sm:px-6 sm:py-3 text-sm font-bold whitespace-nowrap transition-all duration-300 shrink-0 ${active
        ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
        : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-transparent'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
})

export const BigActionCard = memo(function BigActionCard({ title, desc, icon, onClick, count, color = 'purple' }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void, count?: number, color?: 'purple' | 'amber' | 'blue' | 'emerald' }) {
  const colorMap: Record<string, { text: string, bg: string, border: string, glowColor: string, accent: string }> = {
    purple: { text: 'text-indigo-600', bg: 'bg-indigo-50/80', border: 'border-indigo-200/50', glowColor: 'bg-indigo-400', accent: 'bg-indigo-500' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50/80', border: 'border-amber-200/50', glowColor: 'bg-amber-400', accent: 'bg-amber-500' },
    blue: { text: 'text-blue-600', bg: 'bg-blue-50/80', border: 'border-blue-200/50', glowColor: 'bg-blue-400', accent: 'bg-blue-500' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50/80', border: 'border-emerald-200/50', glowColor: 'bg-emerald-400', accent: 'bg-emerald-500' },
  }
  const s = colorMap[color]

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center p-8 sm:p-10 bg-white/[0.25] backdrop-blur-3xl rounded-[32px] border border-white/60 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-white/40 hover:-translate-y-1 active:scale-[0.98] text-center overflow-hidden`}
    >
      {/* Decorative background glow */}
      <div className={`absolute -right-12 -top-12 w-40 h-40 rounded-full ${s.glowColor} blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none`} />

      {count !== undefined && count > 0 && (
        <div className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-sm font-black text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] z-30 animate-pulse">
          {count > 9 ? '9+' : count}
        </div>
      )}
      <div className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl ${s.bg} border ${s.border} mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${s.text} shadow-inner backdrop-blur-md`}>
        {icon}
      </div>
      <h3 className="relative z-10 text-[18px] sm:text-[20px] font-black text-slate-800 tracking-tight drop-shadow-sm">{title}</h3>
      <p className="relative z-10 mt-1.5 text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-widest text-slate-500/90">{desc}</p>
      
      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[4px] rounded-t-full ${s.accent} opacity-60 group-hover:w-2/3 group-hover:opacity-100 transition-all duration-300`} />
    </button>
  )
})

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
