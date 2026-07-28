'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, X, Activity, Archive, Gauge, Radio, Sun, Moon } from 'lucide-react'
import { useLiveSignals } from '@/lib/monosxema/useLiveSignals'
import { computeSnapshotAt } from '@/lib/monosxema/archiveSnapshot'
import { safeStorage } from '@/lib/utils/storage'
import type { ConnStatus, StationDef } from '@/lib/monosxema/types'
import { MonosxemaDiagram } from './MonosxemaDiagram'
import { StatsPanel } from './StatsPanel'
import { ArchiveView } from './ArchiveView'
import { SignalStatsPanel } from './SignalStatsPanel'
import { RailVoltagePanel } from './RailVoltagePanel'
import styles from './Monosxema.module.css'

const CONN_META: Record<ConnStatus, { label: string; dot: string }> = {
  connecting: { label: 'Ulanmoqda…', dot: 'bg-amber-400' },
  online: { label: 'Jonli', dot: 'bg-emerald-400' },
  reconnecting: { label: 'Qayta ulanmoqda…', dot: 'bg-amber-400' },
}

type Tab = 'sxema' | 'statistika' | 'kuchlanish' | 'arxiv'

const THEME_KEY = 'monosxema-theme'

const TABS: { key: Tab; label: string; icon: typeof Activity }[] = [
  { key: 'sxema', label: 'Sxema', icon: Radio },
  { key: 'statistika', label: 'Statistika', icon: Activity },
  { key: 'kuchlanish', label: 'Kuchlanish', icon: Gauge },
  { key: 'arxiv', label: 'Arxiv', icon: Archive },
]

async function enterFullscreenLandscape(el: HTMLElement) {
  try {
    if (el.requestFullscreen) await el.requestFullscreen()
    else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen()
  } catch {
    /* fullscreen so'rovi rad etilishi mumkin (masalan desktopda ba'zi brauzerlarda) — sahifa baribir ochiq qoladi */
  }
  try {
    const orientation = (screen as any).orientation
    if (orientation && orientation.lock) await orientation.lock('landscape')
  } catch {
    /* faqat fullscreen holatida va ba'zi brauzerlarda ishlaydi — qo'llab-quvvatlanmasa jim o'tkazib yuboriladi */
  }
}

async function exitFullscreenAndUnlock() {
  try {
    const orientation = (screen as any).orientation
    if (orientation && orientation.unlock) orientation.unlock()
  } catch {
    /* ignore */
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
  } catch {
    /* ignore */
  }
}

// Kompakt kartochka (bekat sahifasi tepasida) + "Kengaytirish" bosilganda
// to'liq ekran ko'rinishi (gorizontal orientatsiya bilan). Ikkalasi ham bitta
// jonli ma'lumot ulanishidan foydalanadi — ikki marta obuna bo'lmaslik uchun.
export function StationScheme({ station }: { station: StationDef }) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<Tab>('sxema')
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (safeStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'))
  const fullscreenRef = useRef<HTMLDivElement | null>(null)

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      safeStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  const {
    signalStates,
    archiveList,
    isArchiveMode,
    setArchiveMode,
    resetToRealtime,
    applySnapshot,
    connStatus,
    fetchError,
    loadStatus,
  } = useLiveSignals(station)

  const conn = CONN_META[connStatus]

  useEffect(() => {
    if (!expanded) return
    const el = fullscreenRef.current
    if (el) enterFullscreenLandscape(el)

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setExpanded(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      exitFullscreenAndUnlock()
    }
  }, [expanded])

  const handleClose = useCallback(() => setExpanded(false), [])

  const handleShowArchive = useCallback(
    (targetDate: Date) => {
      const snapshot = computeSnapshotAt(targetDate, archiveList, station.id)
      if (!snapshot) {
        setArchiveNotice("Bu vaqtda arxiv ma'lumoti yo'q")
        return
      }
      setArchiveNotice(null)
      applySnapshot(snapshot)
      setArchiveMode(true)
    },
    [archiveList, applySnapshot, setArchiveMode, station.id]
  )

  const handleRealtime = useCallback(() => {
    setArchiveNotice(null)
    resetToRealtime()
    loadStatus(true)
  }, [resetToRealtime, loadStatus])

  return (
    <>
      <div className="mx-3 lg:mx-0 mt-4 sm:mt-6 lg:mt-5 rounded-[32px] bg-white/60 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(31,38,135,0.07)] border border-white/60">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-[10px] sm:text-[12px] font-black uppercase tracking-widest text-slate-500">Bekat monosxemasi</h3>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-0.5">{station.name}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${conn.dot}`} />
              {conn.label}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? "Yorug' rejimga o'tish" : "Tungi rejimga o'tish"}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
            >
              {theme === 'dark' ? <Sun className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} /> : <Moon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <MonosxemaDiagram station={station} signalStates={signalStates} isArchiveMode={false} theme={theme} />
        </div>

        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-[0.98] hover:bg-slate-800"
        >
          <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
          Kengaytirish
        </button>
      </div>

      {expanded && (
        <div ref={fullscreenRef} className={`${styles.root} fixed inset-0 z-[220] flex flex-col`} data-theme={theme} style={{ background: 'var(--ink-900)' }}>
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6" style={{ borderColor: 'var(--line)', background: 'var(--ink-850)' }}>
            <div className="min-w-0">
              <p className={styles.eyebrow}>{station.name}</p>
              <h2 className={`text-[1rem] sm:text-[1.1rem] font-bold ${styles.textStrongest}`}>{station.subtitle}</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={styles.chip}>
                <span className={`h-1.5 w-1.5 rounded-full ${conn.dot}`} />
                {conn.label}
              </span>
              <button
                type="button"
                onClick={toggleTheme}
                className={styles.btn}
                title={theme === 'dark' ? "Yorug' rejimga o'tish" : "Tungi rejimga o'tish"}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" strokeWidth={2.5} /> : <Moon className="h-4 w-4" strokeWidth={2.5} />}
              </button>
              <button type="button" onClick={handleClose} className={styles.btn}>
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 overflow-x-auto px-4 py-2.5 sm:px-6" style={{ borderBottom: '1px solid var(--line)', background: 'var(--ink-850)' }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`${styles.btn} ${tab === t.key ? styles.btnActive : ''} shrink-0`}
                style={tab === t.key ? { background: 'var(--edge)' } : undefined}
              >
                <t.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {tab === 'sxema' && (
              <div className="flex flex-col gap-4">
                <MonosxemaDiagram station={station} signalStates={signalStates} isArchiveMode={isArchiveMode} theme={theme} />
                <StatsPanel station={station} signalStates={signalStates} />
              </div>
            )}
            {tab === 'statistika' && <SignalStatsPanel archiveList={archiveList} stationId={station.id} />}
            {tab === 'kuchlanish' && <RailVoltagePanel station={station} />}
            {tab === 'arxiv' && (
              <ArchiveView
                archiveList={archiveList}
                fetchError={fetchError}
                onShowArchive={handleShowArchive}
                onRealtime={handleRealtime}
                isArchiveMode={isArchiveMode}
                notice={archiveNotice}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
