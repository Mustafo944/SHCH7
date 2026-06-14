'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { LogOut, ShieldAlert } from 'lucide-react'
import useSWR from 'swr'
import { AuroraMeshBackground } from '@/components/AuroraMeshBackground'
import { useSessionGuard } from '@/lib/hooks/useSessionGuard'
import { getIncidents, addIncident, deleteIncident } from '@/lib/supabase-db'
import { IncidentAdminView } from '@/components/admin/IncidentAdminView'

export default function MehnatMuhofazasiPage() {
  const { session, loading: sessionLoading, handleSignOut } = useSessionGuard(['mehnat_muhofazasi'])
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)

  const { data: allIncidents = [], mutate: mutateIncidents } = useSWR(
    session ? 'admin_incidents' : null,
    getIncidents
  )

  const handleAddIncident = useCallback(async (month: string, content: string) => {
    try {
      await addIncident({ month, content })
      mutateIncidents()
    } catch (err) {
      alert("Hodisani qo'shishda xatolik yuz berdi")
    }
  }, [mutateIncidents])

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
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-indigo-500/10">
      <AuroraMeshBackground />

      <div className="relative z-10 flex min-h-screen w-full flex-col">
        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-white/40 backdrop-blur-3xl border-b border-white/60 shadow-sm">
          <div className="px-4 py-4 sm:px-6 md:px-8 mx-auto max-w-[1400px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white shadow-sm border border-slate-100">
                <Image src="/uty-logo.png" alt="Logo" width={32} height={32} className="h-8 w-8 object-contain" />
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-black tracking-widest text-purple-600 uppercase">Smart SHCH</p>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mt-1">
                  Mehnat Muhofazasi Muhandisi
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden md:flex flex-col items-end">
                <p className="text-sm font-black text-slate-900">{session.fullName}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tizim xodimi</p>
              </div>
              <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-0.5">
                <div className="h-full w-full rounded-lg bg-indigo-50 flex items-center justify-center">
                  <span className="text-sm font-black text-indigo-600">MM</span>
                </div>
              </div>
              <div className="h-8 w-[1px] bg-slate-200/60 hidden sm:block mx-2" />
              <button
                onClick={() => setIsSignOutModalOpen(true)}
                className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rose-500 shadow-sm border border-rose-100 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95"
              >
                <LogOut size={18} strokeWidth={2.5} className="transition-transform group-hover:-translate-x-0.5" />
              </button>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 md:px-8 custom-scrollbar">
          <div className="mx-auto max-w-5xl">
            {/* Sarlavha Qismi */}
            <div className="mb-8 p-6 rounded-3xl bg-white/50 backdrop-blur-md border border-white/60 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-red-100 text-red-600 rounded-2xl">
                <ShieldAlert size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900">Baxtsiz Hodisalar Jurnali</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Barcha stansiyalardagi noxush hodisalarni ro'yxatga olish va boshqarish</p>
              </div>
            </div>

            {/* Boshqaruv Qismi */}
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

      {/* SIGN OUT MODAL */}
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
