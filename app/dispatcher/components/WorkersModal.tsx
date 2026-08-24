import React, { useState, useMemo } from 'react'
import { Archive, ChevronLeft, ChevronRight, Edit, MapPin, Phone, RotateCcw, Trash2, Users, X } from 'lucide-react'
import { Station, User } from '@/types'

export function WorkersModal({ workers, stations, onClose, onEdit, onDelete, archivedWorkers, onRestore }: {
  workers: User[]
  stations: Station[]
  onClose: () => void
  onEdit: (w: User) => void
  onDelete: (id: string) => void
  /** Arxivlangan ishchilar (soft-deleted) */
  archivedWorkers?: (User & { deletedAt: string })[]
  /** Arxivdan tiklash */
  onRestore?: (id: string) => void
}) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const stationWorkerMap = useMemo(() => {
    const map: Record<string, User[]> = {}
    workers.forEach(w => {
      (w.stationIds || []).forEach(sid => {
        if (!map[sid]) map[sid] = []
        map[sid].push(w)
      })
    })
    return map
  }, [workers])

  const selectedStation = stations.find(s => s.id === selectedStationId)
  const workersInStation = selectedStationId ? (stationWorkerMap[selectedStationId] || []) : []

  const ROLE_LABELS: Record<string, string> = {
    worker: 'Katta Elektromexanik',
    elektromexanik: 'Elektromexanik',
    elektromontyor: 'Elektromontyor',
    bekat_navbatchisi: 'Bekat Navbatchisi',
    yul_ustasi: "Yo'l Ustasi",
    ech_xodimi: "ECH Xodimi",
    bekat_boshlighi: "Bekat Boshlig'i",
    mehnat_muhofazasi: "Mehnat Muhofazasi",
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] p-0 animate-scale-in bg-slate-50/95 border border-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200/60 px-8 py-6 bg-white">
          <div className="flex items-center gap-4">
            {(selectedStationId || showArchived) && (
              <button
                onClick={() => { setSelectedStationId(null); setShowArchived(false) }}
                className="rounded-xl bg-white border border-slate-200 p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {showArchived
                  ? 'Arxivlangan ishchilar'
                  : selectedStationId
                    ? `${selectedStation?.name} xodimlari`
                    : 'Ishchilar bazasi'}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {showArchived
                  ? `Jami: ${archivedWorkers?.length || 0} ta arxivlangan`
                  : selectedStationId
                    ? `Jami: ${workersInStation.length} ta xodim`
                    : `Jami: ${workers.length} ta xodim · ${stations.length} ta bekat`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-3 text-slate-400 hover:text-slate-900 transition-all duration-200 shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-transparent">
          {showArchived ? (
            /* ── ARXIVLANGAN ISHCHILAR ── */
            <div className="space-y-4">
              {(!archivedWorkers || archivedWorkers.length === 0) ? (
                <div className="py-20 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                    <Archive size={32} />
                  </div>
                  <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Arxivda hech kim yo&apos;q</p>
                  <p className="mt-2 text-xs text-slate-400">Arxivlangan ishchilar bu yerda ko&apos;rinadi</p>
                </div>
              ) : (
                archivedWorkers.map((w) => (
                  <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl transition-all duration-200 hover:shadow-md group border border-amber-100/60 bg-amber-50/30 hover:bg-amber-50/60">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 text-xl font-black text-white shadow-lg shadow-slate-300/20 transition-transform duration-200 group-hover:scale-110">
                        {w.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-600 tracking-tight line-through decoration-slate-300">{w.fullName}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {ROLE_LABELS[w.role] || w.role}
                          </span>
                          <span className="text-xs font-bold text-amber-600">
                            Arxivlangan: {new Date(w.deletedAt).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {onRestore && (
                      <button
                        onClick={() => onRestore(w.id)}
                        className="flex items-center gap-2 rounded-xl bg-emerald-50 px-5 py-2.5 text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 transition-all duration-200 border border-transparent hover:border-emerald-200 shadow-sm"
                      >
                        <RotateCcw size={18} />
                        <span>Tiklash</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : selectedStationId === null ? (
            /* ── BEKATLAR RO'YXATI ── */
            <div className="space-y-8">

              {/* ── BOSHQRMA XODIMLARI (Texnik hujjatlar, Mehnat muhofazasi) ── */}
              {(() => {
                const globalWorkers = workers.filter(w => w.role === 'texnik_hujjatlar' || w.role === 'mehnat_muhofazasi')
                if (globalWorkers.length === 0) return null
                return (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Boshqarma xodimlari</h4>
                    <div className="space-y-3">
                      {globalWorkers.map(w => (
                        <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl transition-all duration-200 hover:shadow-md group border border-white/60 bg-white/70 hover:bg-white/90">
                          <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-xl font-black text-white shadow-lg shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-110">
                              {w.fullName.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-slate-900 tracking-tight">{w.fullName}</h4>
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                  {ROLE_LABELS[w.role] || w.role}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                  <Users size={14} className="text-slate-300" />
                                  {w.login}
                                </span>
                                {w.phone && (
                                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                    <Phone size={14} className="text-slate-300" />
                                    {w.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 self-end sm:self-center">
                            <button
                              onClick={() => onEdit(w)}
                              className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 border border-transparent hover:border-indigo-100 shadow-sm"
                            >
                              <Edit size={18} />
                              <span>Tahrirlash</span>
                            </button>
                            <button
                              onClick={() => onDelete(w.id)}
                              className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-all duration-200 border border-transparent hover:border-amber-200 shadow-sm"
                            >
                              <Archive size={18} />
                              <span>Arxivlash</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* ── BEKATLAR ── */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Bekatlar</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {stations.map(st => {
                    const count = stationWorkerMap[st.id]?.length || 0
                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStationId(st.id)}
                        className="group flex items-center justify-between p-6 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 active:scale-[0.98] border border-white/60 bg-white/70 hover:bg-white/90 hover:border-purple-300/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-100 text-purple-600 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:bg-purple-50">
                            <MapPin size={24} />
                          </div>
                          <div className="text-left">
                            <h4 className="font-black text-slate-900">{st.name}</h4>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{count} ta xodim biriktirilgan</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Arxiv tugmasi */}
              {archivedWorkers && archivedWorkers.length > 0 && (
                <button
                  onClick={() => setShowArchived(true)}
                  className="group flex w-full items-center justify-between p-5 rounded-2xl transition-all duration-300 hover:shadow-lg active:scale-[0.98] border border-amber-200/60 bg-amber-50/50 hover:bg-amber-50/80 hover:border-amber-300/60 mt-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
                      <Archive size={22} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-amber-800 text-sm">Arxivlangan ishchilar</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">{archivedWorkers.length} ta ishchi arxivda</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-amber-300 group-hover:text-amber-600 transition-colors" />
                </button>
              )}
            </div>
          ) : (
            /* ── TANLANGAN BEKAT XODIMLARI ── */
            <div className="space-y-4">
              {workersInStation.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                    <Users size={32} />
                  </div>
                  <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Bu bekatda hali xodimlar yo&apos;q</p>
                </div>
              ) : (
                workersInStation.map((w) => (
                  <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl transition-all duration-200 hover:shadow-md group border border-white/60 bg-white/70 hover:bg-white/90">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-xl font-black text-white shadow-lg shadow-purple-500/20 transition-transform duration-200 group-hover:scale-110">
                        {w.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">{w.fullName}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                            {ROLE_LABELS[w.role] || w.role}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                            <Users size={14} className="text-slate-300" />
                            {w.login}
                          </span>
                          {w.phone && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                              <Phone size={14} className="text-slate-300" />
                              {w.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center">
                      <button
                        onClick={() => onEdit(w)}
                        className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200 border border-transparent hover:border-purple-100 shadow-sm"
                      >
                        <Edit size={18} />
                        <span>Tahrirlash</span>
                      </button>
                      <button
                        onClick={() => onDelete(w.id)}
                        className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-all duration-200 border border-transparent hover:border-amber-200 shadow-sm"
                      >
                        <Archive size={18} />
                        <span>Arxivlash</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
