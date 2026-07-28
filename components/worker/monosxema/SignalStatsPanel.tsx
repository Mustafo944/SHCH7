'use client'

import { normalizeSignalName } from '@/lib/monosxema/signalNames'
import type { ArchiveEntry } from '@/lib/monosxema/types'
import styles from './Monosxema.module.css'

const DAY_MS = 24 * 60 * 60 * 1000

function getTs(entry: ArchiveEntry) {
  if (Number.isFinite(+entry.ts) && +entry.ts > 0) return +entry.ts
  const d = new Date(entry.time || '')
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

export function SignalStatsPanel({ archiveList, stationId }: { archiveList: ArchiveEntry[]; stationId: string }) {
  const since = Date.now() - DAY_MS
  const counts: Record<string, { green: number; red: number }> = {}

  ;(archiveList || []).forEach((entry) => {
    if (getTs(entry) < since) return
    const name = normalizeSignalName(entry.name, stationId)
    if (!counts[name]) counts[name] = { green: 0, red: 0 }
    if (entry.state === 'green') counts[name].green++
    else if (entry.state === 'red') counts[name].red++
  })

  const rows = Object.entries(counts).sort((a, b) => b[1].green + b[1].red - (a[1].green + a[1].red))

  if (!rows.length) {
    return <p className={`text-center py-6 ${styles.root} ${styles.textMuted2}`}>So&apos;nggi 24 soatda o&apos;zgarish qayd etilmagan</p>
  }

  return (
    <div className={`overflow-x-auto ${styles.root}`}>
      <p className={`text-[0.85rem] mb-3 ${styles.textMuted2}`}>So&apos;nggi 24 soat ichidagi o&apos;zgarishlar soni</p>
      <table className={`w-full border-collapse text-[0.92rem] ${styles.textSky2}`}>
        <thead>
          <tr className={`border-b ${styles.borderLine}`} style={{ borderBottomWidth: 1 }}>
            {['Signal', 'Ochilgan', 'Yopilgan', 'Jami'].map((h) => (
              <th key={h} className={`text-left p-2 text-[0.74rem] uppercase tracking-[0.1em] ${styles.textMuted2}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, c]) => (
            <tr key={name} className={`border-b ${styles.borderLine}`} style={{ borderBottomWidth: 1 }}>
              <td className="p-2 font-semibold">{name}</td>
              <td className={`p-2 font-mono ${styles.textOk}`}>{c.green}</td>
              <td className={`p-2 font-mono ${styles.textDanger}`}>{c.red}</td>
              <td className={`p-2 font-mono ${styles.textMuted}`}>{c.green + c.red}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
