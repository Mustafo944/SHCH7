/* eslint-disable @next/next/no-img-element */
'use client'

import type { LucideIcon } from 'lucide-react'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'

export interface SidebarNavItem {
  key: string
  label: string
  icon: LucideIcon
  active?: boolean
  onClick: () => void
}

interface AppSidebarProps {
  items: SidebarNavItem[]
  onSignOut: () => void
  isMobileOpen: boolean
  onMobileClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  userName?: string
  userRole?: string
}

export function AppSidebar({
  items,
  onSignOut,
  isMobileOpen,
  onMobileClose,
  isCollapsed,
  onToggleCollapse,
  userName,
  userRole,
}: AppSidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 lg:z-20 flex flex-col shrink-0 bg-white/40 backdrop-blur-md border-r border-white/40 shadow-2xl lg:shadow-sm transform transition-[width,transform] duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${isCollapsed ? 'w-[260px] lg:w-[88px]' : 'w-[260px]'}`}
      >
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className={`lg:hidden absolute top-1/2 -translate-y-1/2 -right-5 h-10 w-10 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-blue-600 transition-all z-[60] ${
            isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Desktop collapse button */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-4 h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors z-[60]"
        >
          {isCollapsed ? <ChevronRight size={17} strokeWidth={2.5} /> : <ChevronLeft size={17} strokeWidth={2.5} />}
        </button>

        {/* Logo */}
        <div
          className={`flex items-center shrink-0 border-b border-white/40 transition-all duration-300 ${
            isCollapsed ? 'lg:justify-center lg:px-0 gap-3 p-5' : 'gap-3.5 p-5'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center shrink-0">
            <img src="/uty-logo.png" alt="UTY" className="h-full w-full object-contain" />
          </div>
          <div
            className={`flex flex-col justify-center overflow-hidden transition-all duration-300 ${
              isCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-[150px] opacity-100'
            }`}
          >
            <h1 className="text-[14px] font-black uppercase tracking-tight text-[#0050a0] leading-none whitespace-nowrap">O‘ZBEKISTON</h1>
            <h1 className="text-[14px] font-black uppercase tracking-tight text-[#0050a0] leading-none whitespace-nowrap mt-0.5">TEMIR YO‘LLARI</h1>
            <p className="text-[8.5px] font-bold text-slate-500 tracking-[0.18em] mt-1.5 uppercase whitespace-nowrap">SMART CONTROL TIZIMI</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 px-3 pb-3 pt-2">
          <p
            className={`px-2.5 pt-1 pb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 select-none ${
              isCollapsed ? 'lg:hidden' : ''
            }`}
          >
            Asosiy menyu
          </p>

          {items.map(({ key, label, icon: Icon, active, onClick }) => (
            <button
              key={key}
              title={label}
              onClick={() => { onClick(); onMobileClose(); }}
              className={`group relative flex items-center gap-3 rounded-xl p-2.5 pr-3 text-[15px] font-bold transition-colors duration-150 overflow-hidden ${
                active
                  ? 'text-blue-700 bg-white/60 border border-white/70 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
                  active
                    ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-500 group-hover:text-blue-600'
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={`whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>{label}</span>
              {active && <span className={`ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 ${isCollapsed ? 'lg:hidden' : ''}`} />}
            </button>
          ))}

          {/* Sign out */}
          <div className="mt-auto pt-2 border-t border-white/40">
            <button
              title="Chiqish"
              onClick={() => { onMobileClose(); onSignOut(); }}
              className={`group w-full flex items-center gap-3 rounded-xl p-2.5 pr-3 text-[15px] font-bold text-rose-600 hover:bg-rose-50/60 transition-colors duration-150 overflow-hidden ${
                isCollapsed ? 'lg:justify-center lg:px-0' : ''
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50/70 text-rose-500 group-hover:bg-rose-100/80 transition-colors duration-150">
                <LogOut size={19} strokeWidth={2} />
              </span>
              <span className={`whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>Chiqish</span>
            </button>
          </div>
        </nav>

        {/* Train image & user card */}
        <div
          className={`relative shrink-0 w-full transition-all duration-300 ${
            isCollapsed ? 'lg:h-[80px] lg:bg-white/30 lg:border-t lg:border-white/40' : 'h-[200px]'
          }`}
        >
          <div className={`absolute inset-0 pointer-events-none overflow-hidden ${isCollapsed ? 'lg:hidden' : ''}`}>
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/80 to-transparent z-10" />
            <img
              src="/afrosiyob.webp"
              loading="lazy"
              decoding="async"
              onError={(e) => (e.currentTarget.src = '/1.png')}
              alt="Afrosiyob"
              className="w-full h-full object-cover object-[80%_center] opacity-90"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/90 to-transparent z-10" />
          </div>

          <div className={`relative z-20 h-full flex flex-col justify-end px-3 pb-3 ${isCollapsed ? 'lg:p-3 lg:justify-center' : ''}`}>
            <div
              className={`flex items-center rounded-2xl border border-white/50 bg-white/40 backdrop-blur-md shadow-lg transition-all duration-300 ${
                isCollapsed ? 'lg:p-1.5 lg:justify-center' : 'p-3 gap-3'
              }`}
            >
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white font-black text-sm shadow-md shadow-blue-600/25">
                  {userName?.charAt(0) || 'U'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
              </div>
              <div className={`flex-1 min-w-0 overflow-hidden ${isCollapsed ? 'lg:hidden' : ''}`}>
                <p className="truncate text-[13px] font-bold text-slate-900">{userName || 'Foydalanuvchi'}</p>
                <p className="truncate text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">{userRole}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
