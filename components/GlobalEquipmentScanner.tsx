'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { X, Clock, FileText, ChevronRight, Loader2 } from 'lucide-react'
import { QRScannerModal } from './QRScannerModal'
import { buildEquipmentQrValue } from '@/lib/utils/qr'
import { getSchemasByStation, getStationTaskScans, type TaskScan } from '@/lib/supabase-db'
import type { StationEquipments, StationSchema, EquipmentCategory, StationEquipmentItem } from '@/types'

/* ═══════════════════════════════════════════════════════════════════════
   GlobalEquipmentScanner — QR kodni skaner qilib, uskuna ma'lumoti,
   tekshiruv arxivi va sxemalarini ko'rsatadigan global komponent.
   ═══════════════════════════════════════════════════════════════════════ */

interface FoundEquipment {
  item: StationEquipmentItem
  category: EquipmentCategory
}

interface Props {
  isOpen: boolean
  onClose: () => void
  stationId: string
  stationName: string
  stationEquipments: StationEquipments | null | undefined
}

export function GlobalEquipmentScanner({ isOpen, onClose, stationId, stationName, stationEquipments }: Props) {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [foundEquipment, setFoundEquipment] = useState<FoundEquipment | null>(null)
  const [activeView, setActiveView] = useState<'main' | 'archive' | 'schema'>('main')
  const [schemas, setSchemas] = useState<StationSchema[]>([])
  const [scanHistory, setScanHistory] = useState<TaskScan[]>([])
  const [loadingSchemas, setLoadingSchemas] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedSchemaUrl, setSelectedSchemaUrl] = useState<string | null>(null)
  const [loadingSchemaId, setLoadingSchemaId] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // QR koddan uskunani aniqlash xaritasi
  const equipmentMap = useMemo(() => {
    const map = new Map<string, FoundEquipment>()
    if (!stationEquipments?.categories) return map
    stationEquipments.categories.forEach(cat => {
      (cat.items || []).forEach(item => {
        const qrValue = buildEquipmentQrValue(stationId, item.id)
        map.set(qrValue, { item, category: cat })
      })
    })
    return map
  }, [stationEquipments, stationId])

  // isOpen o'zgarganda reset
  useEffect(() => {
    if (isOpen) {
      setFoundEquipment(null)
      setActiveView('main')
      setSchemas([])
      setScanHistory([])
      setSelectedSchemaUrl(null)
      setScannerOpen(true)
    }
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [isOpen])

  // Sxemalar va arxivni yuklash
  const loadData = useCallback(async (equipmentId: string, equipmentName: string) => {
    setLoadingSchemas(true)
    setLoadingHistory(true)
    try {
      const schemasData = await getSchemasByStation(stationId)
      // Faqat shu qurilmaga tegishli sxemalarni topamiz (schema_type da qurilma nomi yoki umumiy sxemalar)
      const prefix = `[${equipmentName}] `
      setSchemas(schemasData.filter(s => s.schemaType.startsWith(prefix) || !s.schemaType.startsWith('[')))
    } catch { /* */ } finally {
      setLoadingSchemas(false)
    }
    try {
      const history = await getStationTaskScans(stationId, 100)
      // Faqat shu qurilmaga tegishli skaner tarixini topamiz
      const equipmentQrValue = buildEquipmentQrValue(stationId, equipmentId)
      setScanHistory(history.filter(s => s.equipment_id === equipmentQrValue))
    } catch { /* */ } finally {
      setLoadingHistory(false)
    }
  }, [stationId])

  const handleScanSuccess = useCallback((decodedText: string) => {
    const found = equipmentMap.get(decodedText)
    if (found) {
      setFoundEquipment(found)
      setScannerOpen(false)
      setActiveView('main')
      loadData(found.item.id, found.item.name)
    } else {
      // QR kod topilmadi — skanerni qaytadan ochadi
      setScannerOpen(false)
      setFoundEquipment(null)
      // Bir oz kechikish bilan xabar ko'rsatish mumkin
      setTimeout(() => setScannerOpen(true), 300)
    }
  }, [equipmentMap, loadData])

  const handlePreviewSchema = async (schema: StationSchema) => {
    try {
      setLoadingSchemaId(schema.id)
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent)
      if (isMobile) {
        setSelectedSchemaUrl(schema.filePath)
        setActiveView('schema')
        return
      }
      const response = await fetch(schema.filePath)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      setSelectedSchemaUrl(url)
      setActiveView('schema')
    } catch {
      setSelectedSchemaUrl(schema.filePath)
      setActiveView('schema')
    } finally {
      setLoadingSchemaId(null)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* QR Skaner modali */}
      {scannerOpen && (
        <QRScannerModal
          isOpen={scannerOpen}
          onClose={() => { setScannerOpen(false); if (!foundEquipment) onClose(); }}
          onScanSuccess={handleScanSuccess}
          title="Qurilma QR kodni skanerlang"
        />
      )}

      {/* Uskuna ma'lumot modali */}
      {foundEquipment && !scannerOpen && activeView !== 'schema' && (
        <div
          className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div className="relative w-full sm:max-w-md mx-0 sm:mx-4 bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-fade-up max-h-[90vh] flex flex-col">
            
            {/* Header — uskuna nomi va holati */}
            <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-100">
              {/* Mobileda pastdan ochilayotganini ko'rsatuvchi tutqich */}
              <div className="flex justify-center mb-4 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl text-white font-black text-xl shadow-lg"
                    style={{ background: foundEquipment.category.color || '#8b5cf6' }}
                  >
                    {foundEquipment.category.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight truncate">
                      {foundEquipment.item.name}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest truncate">
                      {foundEquipment.category.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Soz</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 p-2.5 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tugmalar ro'yxati */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-3 custom-scrollbar">

              {/* Tekshiruv arxivi */}
              <button
                onClick={() => setActiveView('archive')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <Clock size={22} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h4 className="text-sm font-black text-slate-800 tracking-tight">Tekshiruv arxivi</h4>
                  <p className="text-[10.5px] font-bold text-slate-500 mt-0.5">
                    {loadingHistory ? 'Yuklanmoqda...' : `${scanHistory.length} ta yozuv`}
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>

              {/* Sxemalar ro'yxati (dinamik) */}
              {loadingSchemas ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={24} className="animate-spin text-purple-500" />
                </div>
              ) : schemas.length > 0 ? (
                schemas.map(schema => (
                  <button
                    key={schema.id}
                    onClick={() => handlePreviewSchema(schema)}
                    disabled={loadingSchemaId === schema.id}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 hover:shadow-md hover:border-violet-200 transition-all active:scale-[0.98] group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/20 group-hover:scale-110 transition-transform">
                      {loadingSchemaId === schema.id ? (
                        <Loader2 size={22} className="animate-spin" />
                      ) : (
                        <FileText size={22} />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h4 className="text-sm font-black text-slate-800 tracking-tight truncate">{schema.schemaType}</h4>
                      <p className="text-[10.5px] font-bold text-slate-500 mt-0.5 truncate">{schema.fileName}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-violet-600 transition-colors" />
                  </button>
                ))
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sxemalar topilmadi</p>
                  <p className="text-[10.5px] text-slate-400 mt-1">Dispetcher yoki katta elektromexanik sxema yuklamagan</p>
                </div>
              )}
            </div>

            {/* Qayta skaner qilish */}
            <div className="shrink-0 px-6 pb-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => { setFoundEquipment(null); setScannerOpen(true); }}
                className="w-full py-3.5 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all active:scale-[0.98]"
              >
                Boshqa qurilmani skaner qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tekshiruv arxivi ko'rinishi */}
      {foundEquipment && activeView === 'archive' && !scannerOpen && (
        <div
          className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div className="relative w-full sm:max-w-md mx-0 sm:mx-4 bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-fade-up max-h-[90vh] flex flex-col">
            <div className="shrink-0 flex items-center gap-3 px-6 py-5 border-b border-slate-100">
              <div className="flex justify-center mb-0 sm:hidden absolute top-3 left-1/2 -translate-x-1/2">
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>
              <button
                onClick={() => setActiveView('main')}
                className="shrink-0 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all active:scale-90"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 tracking-tight truncate">Tekshiruv arxivi</h3>
                <p className="text-[10.5px] font-bold text-slate-500 truncate">{foundEquipment.item.name}</p>
              </div>
              <button
                onClick={onClose}
                className="ml-auto shrink-0 p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-2 custom-scrollbar">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-blue-500" />
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-400">Tekshiruv tarixi topilmadi</p>
                </div>
              ) : (
                scanHistory.map(scan => (
                  <div key={scan.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600 shrink-0">
                      <Clock size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{scan.scanned_by}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">{scan.task_nsh}</p>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 shrink-0">
                      {new Date(scan.scanned_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sxema ko'rish (to'liq ekran) */}
      {activeView === 'schema' && selectedSchemaUrl && (
        <div className="fixed inset-0 z-[9500] flex flex-col bg-white animate-scale-in">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 px-5 py-3 bg-slate-50/80">
            <button
              onClick={() => { setActiveView('main'); setSelectedSchemaUrl(null); if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null } }}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronRight size={18} className="rotate-180" />
              Orqaga
            </button>
            <button
              onClick={() => { setActiveView('main'); setSelectedSchemaUrl(null); if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null } }}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm"
            >
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <iframe src={selectedSchemaUrl} className="h-full w-full" title="Sxema ko'rish" />
          </div>
        </div>
      )}
    </>
  )
}
