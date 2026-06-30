import React from 'react'
import { ArrowRight } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════
   BigActionCard — yengil, har joyda ishlatiladigan harakat kartochkasi
   ═══════════════════════════════════════════════════════════════════════ */

const COLOR_STYLES: Record<string, { bg: string; text: string }> = {
  purple: { bg: 'bg-purple-50', text: 'text-indigo-600' },
  cyan:   { bg: 'bg-cyan-50',   text: 'text-indigo-600' },
  amber:  { bg: 'bg-amber-50',  text: 'text-indigo-600' },
  blue:   { bg: 'bg-blue-50',   text: 'text-indigo-600' },
  sky:    { bg: 'bg-sky-50',    text: 'text-indigo-600' },
}

export function BigActionCard({
  title,
  desc,
  icon,
  onClick,
  color = 'cyan',
  badge = 0,
  count,
}: {
  title: string
  desc: string
  icon: React.ReactNode
  onClick: () => void
  color?: 'purple' | 'cyan' | 'amber' | 'blue' | 'sky'
  badge?: number
  count?: number
}) {
  const theme = COLOR_STYLES[color] ?? COLOR_STYLES.purple
  const displayBadge = badge || count || 0

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start p-6 bg-white/30 backdrop-blur-[40px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.07)] transition-all hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(31,38,135,0.15)] hover:border-white/80 hover:-translate-y-1 active:scale-[0.98] text-left w-full h-full min-h-[140px] overflow-hidden"
    >
      {/* Glossy reflection line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 z-20" />

      {displayBadge > 0 && (
        <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[11px] font-black text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] z-30">
          {displayBadge > 9 ? '9+' : displayBadge}
        </div>
      )}

      <div
        className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/90 to-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white/60 mb-4 transition-transform group-hover:scale-110 group-hover:shadow-[0_8px_24px_rgba(79,70,229,0.2)] ${theme.text} group-hover:text-indigo-700`}
      >
        {icon}
      </div>

      <h3 className="relative z-10 text-[17px] sm:text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-900">
        {title}
      </h3>
      <p className="relative z-10 mt-1 text-[13px] sm:text-[15px] text-slate-600 leading-relaxed font-bold line-clamp-2 pr-6">
        {desc}
      </p>

      <div className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 transition-all duration-300 group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-md z-10 shrink-0">
        <ArrowRight size={18} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform duration-300" />
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   HeaderCard — sahifa sarlavhasi
   ═══════════════════════════════════════════════════════════════════════ */

const STATUS_CLASSES: Record<string, string> = {
  tasdiqlandi: 'badge-success',
  kutilmoqda: 'badge-warning',
  'rad etilgan': 'badge-danger',
  yangi: 'badge-info',
  "ko'rish": 'badge-info',
  error: 'bg-red-100 text-red-600 border-red-200 border shadow-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest',
}

export function HeaderCard({
  title,
  subtitle,
  status,
  statusColor,
}: {
  title: string
  subtitle: string
  status?: string
  statusColor?: string
}) {
  return (
    <div className="rounded-[32px] bg-white/30 backdrop-blur-[40px] p-6 sm:p-8 shadow-[0_8px_32px_rgba(31,38,135,0.05)] border border-white/60 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between relative z-10">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-900 tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-black text-indigo-600/80 uppercase tracking-widest">
            {subtitle}
          </p>
        </div>
        {status && (
          <div
            className={`${
              statusColor && STATUS_CLASSES[statusColor]
                ? STATUS_CLASSES[statusColor]
                : STATUS_CLASSES[status.toLowerCase()] || 'badge'
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  )
}
