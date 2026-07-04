'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { LogOut, ShieldAlert, ChevronLeft, ChevronRight, Menu, Home } from 'lucide-react'
import useSWR from 'swr'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import { useSessionGuard } from '@/lib/hooks/useSessionGuard'
import { getIncidents, addIncident, deleteIncident } from '@/lib/supabase-db'
import { IncidentAdminView } from '@/components/admin/IncidentAdminView'

export default function MehnatMuhofazasiPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard(['mehnat_muhofazasi'])
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  const { data: allIncidents = [], mutate: mutateIncidents } = useSWR(
    session ? 'admin_incidents' : null,
    getIncidents
  )

  const handleAddIncident = useCallback(async (month: string, content: string) => {
    if (!session) return
    try {
      await addIncident(month, content, session.fullName)
      mutateIncidents()
    } catch (err) {
      alert("Hodisani qo'shishda xatolik yuz berdi")
    }
  }, [session, mutateIncidents])

  const handleRemoveIncident = useCallback(async (id: string) => {
    try {
      await deleteIncident(id)
      mutateIncidents()
    } catch (err) {
      alert("Hodisani o'chirishda xatolik yuz berdi")
    }
  }, [mutateIncidents])

  if (sessionLoading || !session) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <div className="flex flex-col items-center gap-4 animate-fade-up">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
        <p className="text-sm font-semibold uppercase tracking-widest text-purple-600 animate-pulse">Yuklanmoqda...</p>
      </div>
    </div>
  )

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-blue-500/10 font-sans">
      <AuroraMeshBackground />

      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsMobileSidebarOpen(false)} 
        />
      )}

      <aside className={`bg-white/40 backdrop-blur-3xl border-r border-white/40 flex flex-col shrink-0 shadow-2xl lg:shadow-sm z-50 lg:z-20 fixed lg:relative inset-y-0 left-0 transform transition-all duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isDesktopSidebarCollapsed ? 'w-[260px] lg:w-[88px]' : 'w-[260px]'}`}>
        
        <button 
          onClick={() => setIsMobileSidebarOpen(false)} 
          className={`lg:hidden absolute top-1/2 -translate-y-1/2 -right-5 h-10 w-10 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-blue-600 transition-all z-[60] duration-300 ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronLeft size={20} />
        </button>

        <button 
          onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)} 
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-5 h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-blue-600 transition-all z-[60]"
        >
          {isDesktopSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <div className="shrink-0">
          <div className={`flex items-center ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0 p-6 gap-3' : 'gap-4 p-6'} mb-2 transition-all duration-300 relative`}>
            <div className="flex h-14 w-14 items-center justify-center shrink-0 relative">
              <Image src="/uty-logo.png" alt="UTY" fill className="object-contain" sizes="56px" />
            </div>
            <div className={`flex flex-col justify-center overflow-hidden transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-[140px] opacity-100'}`}>
              <h1 className="text-[15px] font-black uppercase tracking-tight text-[#0050a0] leading-none whitespace-nowrap">O‘ZBEKISTON</h1>
              <h1 className="text-[15px] font-black uppercase tracking-tight text-[#0050a0] leading-none whitespace-nowrap mt-0.5">TEMIR YO‘LLARI</h1>
              <p className="text-[9px] font-bold text-slate-500 tracking-[0.15em] mt-1.5 uppercase whitespace-nowrap">SMART CONTROL TIZIMI</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 px-4 pb-2 mt-2">
            <button 
              onClick={() => { setIsMobileSidebarOpen(false); }} 
              className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition-all overflow-hidden bg-blue-50 text-blue-600 ${isDesktopSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
            >
              <Home size={18} className="shrink-0" /> 
              <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>Bosh sahifa</span>
            </button>
        </nav>

        <div className={`relative shrink-0 w-full transition-all duration-300 mt-auto ${isDesktopSidebarCollapsed ? 'lg:h-auto lg:bg-white/40 lg:border-t lg:border-white/60' : 'h-[220px]'}`}>
           <div className={`absolute inset-0 pointer-events-none overflow-hidden ${isDesktopSidebarCollapsed ? 'lg:hidden' : ''}`}>
             <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/80 to-transparent z-10" />
             <Image
               src="/afrosiyob.png"
               alt="Afrosiyob"
               fill
               className="object-cover object-[80%_center] opacity-100"
               sizes="(max-width: 768px) 100vw, 256px"
             />
             <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/90 to-transparent z-10" />
           </div>

           <div className={`relative z-20 h-full flex flex-col justify-end px-4 pb-4 ${isDesktopSidebarCollapsed ? 'lg:p-3 lg:justify-center' : ''}`}>
             <div className="relative w-full mx-auto max-w-[230px]">
               {isProfileMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-30" onClick={() => setIsProfileMenuOpen(false)} />
                   <div className="absolute bottom-full left-0 right-0 mb-2 z-40 bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-1.5 animate-fade-up origin-bottom">
                     <button
                       onClick={() => {
                         setIsProfileMenuOpen(false);
                         setIsSignOutModalOpen(true);
                       }}
                       className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors font-bold text-sm"
                     >
                       <LogOut size={18} />
                       {!isDesktopSidebarCollapsed && <span>Chiqish</span>}
                     </button>
                   </div>
                 </>
               )}

               <button 
                 onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                 className={`flex items-center rounded-2xl backdrop-blur-md border shadow-lg transition-all duration-300 active:scale-95 text-left w-full ${isDesktopSidebarCollapsed ? 'lg:p-2 lg:justify-center' : 'p-3 gap-3'} ${isProfileMenuOpen ? 'bg-white/60 border-blue-300 ring-4 ring-blue-500/20' : 'bg-white/40 border-white/50 hover:bg-white/50'}`}
               >
                 <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
                   <div className="h-full w-full bg-gradient-to-br from-indigo-100/80 to-indigo-50/80 flex items-center justify-center text-indigo-700 font-bold shadow-inner">
                       {session?.fullName?.charAt(0) || 'M'}
                   </div>
                 </div>
                 <div className={`flex-1 min-w-0 transition-all duration-300 overflow-hidden ${isDesktopSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'opacity-100 w-auto'}`}>
                   <p className="truncate text-sm font-bold text-slate-900">{session?.fullName || 'Foydalanuvchi'}</p>
                   <p className="truncate text-[11px] font-bold text-slate-600 uppercase">
                      MM Muhandisi
                   </p>
                 </div>
               </button>
             </div>
           </div>
        </div>
      </aside>

      <div className="relative flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-transparent pt-3 px-4 sm:px-6 mx-auto w-full max-w-[1600px] print:hidden">
          <div className="flex w-full items-center justify-between bg-white/10 backdrop-blur-xl px-3 sm:px-5 py-2 sm:py-3 rounded-[24px] sm:rounded-[32px] border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={() => setIsMobileSidebarOpen(true)} className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white/20 backdrop-blur-md p-2 shadow-sm border border-white/30 text-slate-600 hover:bg-slate-50 transition-all active:scale-95">
                <Menu size={20} />
              </button>
              {/* UTY Logo */}
              <div className="hidden sm:flex relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[16px] bg-white/20 backdrop-blur-md p-2 shadow-sm border border-white/30">
                <Image src="/uty-logo.png" alt="UTY" fill className="object-contain p-2 drop-shadow-sm" sizes="48px" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-[15px] sm:text-[18px] font-black uppercase tracking-tight text-slate-900 leading-none">SMART SHCH</h1>
                <p className="text-[8px] sm:text-[9.5px] font-black text-purple-600 truncate uppercase tracking-widest mt-1 drop-shadow-sm">MEHNAT MUHOFAZASI</p>
                <p className="text-[10px] font-black text-slate-400 truncate uppercase tracking-tight mt-0.5 sm:hidden">MM Muhandisi</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/20 border border-white/30 shadow-sm backdrop-blur-md">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                <span className="text-[11px] font-black text-slate-700 tracking-widest uppercase">Muhandis</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pt-4 sm:pt-8 px-4 lg:px-8 pb-8 custom-scrollbar">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 p-6 rounded-3xl bg-white/50 backdrop-blur-md border border-white/60 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-red-100 text-red-600 rounded-2xl">
                <ShieldAlert size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900">Baxtsiz Hodisalar Jurnali</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Barcha stansiyalardagi noxush hodisalarni ro'yxatga olish va boshqarish</p>
              </div>
            </div>

            <div className="bg-white/40 backdrop-blur-md border border-white/60 shadow-sm rounded-3xl p-6 sm:p-8">
              <IncidentAdminView
                incidents={allIncidents}
                onAdd={handleAddIncident}
                onDelete={handleRemoveIncident}
              />
            </div>
          </div>
        </main>
      </div>

      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-8 text-center shadow-2xl animate-fade-up">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-rose-50 shadow-inner">
              <LogOut size={32} className="text-rose-500" strokeWidth={2.5} />
            </div>
            <h3 className="mb-2 text-2xl font-black text-slate-900 tracking-tight">Tizimdan chiqish</h3>
            <p className="mb-8 text-sm font-medium text-slate-500">Haqiqatan ham tizimdan chiqmoqchimisiz?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsSignOutModalOpen(false)}
                className="flex-1 rounded-2xl bg-slate-100 py-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 active:bg-slate-300"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 rounded-2xl bg-rose-500 py-4 text-sm font-bold text-white shadow-lg shadow-rose-500/30 transition-all hover:bg-rose-600 active:scale-95"
              >
                Ha, chiqish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
