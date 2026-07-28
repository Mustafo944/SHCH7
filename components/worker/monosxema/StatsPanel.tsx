'use client'

import { normalizeSignalName } from '@/lib/monosxema/signalNames'
import { stationMainSignalNames } from '@/lib/monosxema/stations'
import type { SignalState, StationDef } from '@/lib/monosxema/types'
import styles from './Monosxema.module.css'

function StatCard({ label, value, hint, valueClassName }: { label: string; value: number; hint: string; valueClassName?: string }) {
  return (
    <article className={`${styles.surfaceCard} rounded-xl p-3.5`}>
      <span className={`block uppercase tracking-[0.14em] text-[0.7rem] ${styles.textMuted2}`}>{label}</span>
      <strong className={`block text-[1.7rem] my-1 font-mono ${valueClassName || styles.textStrongest}`}>{value}</strong>
      <small className={`text-[0.85rem] ${styles.textMuted}`}>{hint}</small>
    </article>
  )
}

export function StatsPanel({ station, signalStates }: { station: StationDef; signalStates: Record<string, SignalState> }) {
  const signalKeys = stationMainSignalNames(station)
  const vals = signalKeys.map((k) => signalStates[normalizeSignalName(k, station.id)] || 'red')
  const greenCount = vals.filter((v) => v === 'green').length
  const redCount = vals.filter((v) => v === 'red').length
  const signalCount = signalKeys.length
  const trackCount = station.trackCount ?? (station.voltageSections || []).length
  const hint = `${signalCount} asosiy svetofor bo'yicha`

  return (
    <section className={`${styles.root} ${styles.surfacePanel} rounded-xl p-4`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2.5 mb-3.5">
        <div>
          <p className={styles.eyebrow}>Statistika</p>
          <h2 className={`text-[1.05rem] font-bold mt-1 ${styles.textStrongest}`}>Umumiy holat va ko&apos;rsatkichlar</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Umumiy yo'llar" value={trackCount} hint="Asosiy yo'llar, shoxlar va yon yo'laklar" />
        <StatCard label="Umumiy svetoforlar" value={signalCount} hint={`${signalCount} ta asosiy svetofor`} />
        <StatCard label="Ochiq" value={greenCount} hint={hint} valueClassName={styles.textOk} />
        <StatCard label="Band" value={redCount} hint={hint} valueClassName={styles.textDanger} />
      </div>
    </section>
  )
}
