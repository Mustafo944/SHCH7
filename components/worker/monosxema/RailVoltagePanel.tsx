'use client'

import { normalizeSignalName } from '@/lib/monosxema/signalNames'
import { useRailVoltage } from '@/lib/monosxema/useRailVoltage'
import type { StationDef } from '@/lib/monosxema/types'
import styles from './Monosxema.module.css'

const POWER_HIGH = 235
const POWER_LOW = 185

const EVENT_LABELS: Record<string, string> = {
  high_start: 'Yuqori kuchlanish boshlandi',
  high_end: 'Yuqori kuchlanish tugadi',
  low_start: 'Past kuchlanish boshlandi',
  low_end: 'Past kuchlanish tugadi',
}
const SIDE_LABELS: Record<string, string> = { power: 'Quvvat', relay: 'Rele' }

function fmt(v: number | null | undefined) {
  return typeof v === 'number' ? `${v.toFixed(1)}V` : '—'
}
function fmtTime(t: string | null | undefined) {
  if (!t) return '—'
  return new Date(t).toLocaleTimeString('uz-UZ')
}
function isAlarm(value: number | null | undefined, low: number | null | undefined, high: number | null | undefined) {
  if (typeof value !== 'number') return false
  if (typeof high === 'number' && value > high) return true
  if (typeof low === 'number' && value < low) return true
  return false
}

export function RailVoltagePanel({ station }: { station: StationDef }) {
  const { rows, limits, alarms, error, sectionNames } = useRailVoltage(station)

  return (
    <div className={`overflow-x-auto ${styles.root}`}>
      {error && <p className={`mb-2 ${styles.textDanger}`}>{error}</p>}
      <table className={`w-full border-collapse text-[0.92rem] ${styles.textSky2}`}>
        <thead>
          <tr className={`border-b ${styles.borderLine}`} style={{ borderBottomWidth: 1 }}>
            {['Seksiya', 'Quvvat tomoni', 'Rele tomoni', 'Vaqt'].map((h) => (
              <th key={h} className={`text-left p-2 text-[0.74rem] uppercase tracking-[0.1em] ${styles.textMuted2}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sectionNames.map((name) => {
            const r = rows[name]
            const lim = limits[name]
            const powerAlarm = isAlarm(r?.power_voltage, POWER_LOW, POWER_HIGH)
            const relayAlarm = isAlarm(r?.relay_voltage, lim?.relay_low, lim?.relay_high)
            return (
              <tr key={name} className={`border-b ${styles.borderLine}`} style={{ borderBottomWidth: 1 }}>
                <td className="p-2 font-semibold">{name}</td>
                <td className={`p-2 font-mono ${powerAlarm ? `${styles.textDanger} font-bold` : ''}`}>{fmt(r?.power_voltage)}</td>
                <td className={`p-2 font-mono ${relayAlarm ? `${styles.textDanger} font-bold` : ''}`}>{fmt(r?.relay_voltage)}</td>
                <td className={`p-2 font-mono text-[0.85rem] ${styles.textMuted}`}>{fmtTime(r?.updated_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className={`mt-4 mb-2 ${styles.eyebrow}`}>Ogohlantirishlar tarixi</p>
      <table className={`w-full border-collapse text-[0.88rem] ${styles.textSky2}`}>
        <thead>
          <tr className={`border-b ${styles.borderLine}`} style={{ borderBottomWidth: 1 }}>
            {['Seksiya', 'Tomon', 'Hodisa', 'Kuchlanish', 'Vaqt'].map((h) => (
              <th key={h} className={`text-left p-2 text-[0.7rem] uppercase tracking-[0.1em] ${styles.textMuted2}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {alarms.length === 0 && (
            <tr>
              <td className={`p-2 ${styles.textMuted}`} colSpan={5}>
                Hozircha ogohlantirish yo&apos;q
              </td>
            </tr>
          )}
          {alarms.map((a) => {
            const isEnd = a.event === 'high_end' || a.event === 'low_end'
            return (
              <tr key={a.id} className={`border-b ${styles.borderLine}`} style={{ borderBottomWidth: 1 }}>
                <td className="p-2 font-semibold">{normalizeSignalName(a.name, station.id)}</td>
                <td className="p-2">{SIDE_LABELS[a.side] || a.side}</td>
                <td className={`p-2 ${isEnd ? styles.textMuted : `${styles.textDanger} font-semibold`}`}>{EVENT_LABELS[a.event] || a.event}</td>
                <td className="p-2 font-mono">{fmt(a.voltage)}</td>
                <td className={`p-2 font-mono text-[0.85rem] ${styles.textMuted}`}>{fmtTime(a.ts)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
