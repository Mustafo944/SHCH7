import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Edit, MapPin, Phone, Trash2, Users, X } from 'lucide-react'
import { Station, User } from '@/types'

export function WorkersModal({ workers, stations, onClose, onEdit, onDelete }: {
  workers: User[]
  stations: Station[]
  onClose: () => void
  onEdit: (w: User) => void
  onDelete: (id: string) => void
}) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
      <div className="premium-card flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden p-0 animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6 bg-slate-50/50">
          <div className="flex items-center gap-4">
            {selectedStationId && (
              <button
                onClick={() => setSelectedStationId(null)}
                className="rounded-xl bg-white border border-slate-200 p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {selectedStationId ? `${selectedStation?.name} xodimlari` : 'Ishchilar bazasi'}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {selectedStationId ? `Jami: ${workersInStation.length} ta xodim` : `Jami: ${workers.length} ta xodim · ${stations.length} ta bekat`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-3 text-slate-400 hover:text-slate-900 transition-all duration-200 shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-white">
          {selectedStationId === null ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {stations.map(st => {
                const count = stationWorkerMap[st.id]?.length || 0
                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStationId(st.id)}
                    className="premium-card group flex items-center justify-between p-6 transition-all duration-300 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 active:scale-[0.98] border-slate-100 bg-slate-50/30"
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
          ) : (
            <div className="space-y-4">
              {workersInStation.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                    <Users size={32} />
                  </div>
                  <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Bu bekatda hali xodimlar yo'q</p>
                </div>
              ) : (
                workersInStation.map((w) => (
                  <div key={w.id} className="premium-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 transition-all duration-200 hover:shadow-md group border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-xl font-black text-white shadow-lg shadow-purple-500/20 transition-transform duration-200 group-hover:scale-110">
                        {w.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">{w.fullName}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                            {w.role === 'worker' ? 'Katta Elektromexanik' : w.role === 'elektromexanik' ? 'Elektromexanik' : w.role === 'elektromontyor' ? 'Elektromontyor' : w.role === 'bekat_navbatchisi' ? 'Bekat Navbatchisi' : w.role === 'yul_ustasi' ? "Yo'l Ustasi" : w.role === 'ech_xodimi' ? "ECH Xodimi" : "Bekat Boshlig'i"}
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
                        className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-400 hover:text-red-700 hover:bg-red-100 transition-all duration-200 border border-transparent hover:border-red-100 shadow-sm"
                      >
                        <Trash2 size={18} />
                        <span>O'chirish</span>
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
