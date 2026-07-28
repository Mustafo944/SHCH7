import { normalizeSignalName } from './signalNames'
import type { ArchiveEntry } from './types'

// qorlitog_server loyihasidagi App.jsx'dan portlangan — arxiv yozuvidan vaqtni
// olish va tanlangan vaqtdagi signal holatlari "suratini" (snapshot) hisoblash.

export function parseArchiveTime(entry: ArchiveEntry | null | undefined): Date | null {
  if (!entry) return null
  if (Number.isFinite(+entry.ts) && +entry.ts > 0) return new Date(+entry.ts)
  const str = entry.time
  if (!str) return null
  const m = String(str).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2}):(\d{2})/)
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6])
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export function computeSnapshotAt(targetDate: Date, archiveList: ArchiveEntry[], stationId: string): Record<string, string> | null {
  const list = archiveList || []
  if (!list.length) return null
  const snapshot: Record<string, string> = {}
  ;[...list].reverse().forEach((entry) => {
    const t = parseArchiveTime(entry)
    if (!t) return
    if (t > targetDate) return
    snapshot[normalizeSignalName(entry.name, stationId)] = entry.state
  })
  return Object.keys(snapshot).length ? snapshot : null
}
