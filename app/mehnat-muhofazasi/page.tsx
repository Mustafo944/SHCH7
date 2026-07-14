'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { LogOut, ShieldAlert, Menu, Home } from 'lucide-react'
import useSWR from 'swr'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import { AppSidebar, type SidebarNavItem } from '@/components/AppSidebar'
import { useSessionGuard } from '@/lib/hooks/useSessionGuard'
import { getIncidents, addIncident, deleteIncident, updateIncidentSeverity } from '@/lib/supabase-db'
import { IncidentAdminView } from '@/components/admin/IncidentAdminView'
import type { IncidentSeverity } from '@/types'

export default function MehnatMuhofazasiPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard(['mehnat_muhofazasi'])
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)

  const { data: allIncidents = [], mutate: mutateIncidents } = useSWR(
    session ? 'admin_incidents' : null,
    getIncidents
  )

  const handleAddIncident = useCallback(async (month: string, content: string, severity: IncidentSeverity) => {
    if (!session) return
    try {
      await addIncident(month, content, session.fullName, severity)
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

  const handleUpdateSeverity = useCallback(async (id: string, severity: IncidentSeverity) => {
    try {
      await updateIncidentSeverity(id, severity)
      mutateIncidents()
    } catch (err) {
      alert("Hodisani o'zgartirishda xatolik yuz berdi")
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

  const sidebarItems: SidebarNavItem[] = [
    { key: 'home', label: 'Bosh sahifa', icon: Home, active: true, onClick: () => {} },
  ]

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-blue-500/10 font-sans">
      <AuroraMeshBackground />

      <AppSidebar
        items={sidebarItems}
        onSignOut={() => setIsSignOutModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isDesktopSidebarCollapsed}
        onToggleCollapse={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
        userName={session?.fullName}
        userRole="MM Muhandisi"
      />

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
                onUpdateSeverity={handleUpdateSeverity}
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
