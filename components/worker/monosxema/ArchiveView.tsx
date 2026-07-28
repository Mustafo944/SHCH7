'use client'

import { useCallback, useState } from 'react'
import type { ArchiveEntry } from '@/lib/monosxema/types'
import styles from './Monosxema.module.css'

function formatTime(entry: ArchiveEntry) {
  if (entry.time) return entry.time
  if (Number.isFinite(+entry.ts) && +entry.ts > 0) return new Date(+entry.ts).toLocaleString('uz-UZ')
  return '—'
}

function StateBadge({ state }: { state: ArchiveEntry['state'] }) {
  const open = state === 'green'
  return (
    <span className={`inline-flex items-center gap-1.5 ${open ? styles.textOk : styles.textDanger}`}>
      <span className={`w-2 h-2 rounded-full ${open ? styles.bgOk : styles.bgDanger}`} />
      {open ? 'Ochiq' : 'Band'}
    </span>
  )
}

export function ArchiveView({
  archiveList,
  fetchError,
  onShowArchive,
  onRealtime,
  isArchiveMode,
  notice,
}: {
  archiveList: ArchiveEntry[]
  fetchError: string | null
  onShowArchive: (date: Date) => void
  onRealtime: () => void
  isArchiveMode: boolean
  notice?: string | null
}) {
  const [selectedTime, setSelectedTime] = useState('')

  const handleShow = useCallback(() => {
    if (!selectedTime) return
    onShowArchive(new Date(selectedTime))
  }, [selectedTime, onShowArchive])

  const handleRowClick = useCallback(
    (entry: ArchiveEntry) => {
      const t = Number.isFinite(+entry.ts) && +entry.ts > 0 ? new Date(+entry.ts) : entry.time ? new Date(entry.time) : null
      if (t && !isNaN(t.getTime())) onShowArchive(t)
    },
    [onShowArchive]
  )

  const hasRows = archiveList && archiveList.length > 0
  const list = hasRows ? archiveList.slice(0, 200) : []

  return (
    <div className={styles.root}>
      <div className="flex justify-between items-end gap-2.5 mb-3.5 flex-wrap">
        <div>
          <p className={styles.eyebrow}>Arxiv bo&apos;limi</p>
          <h2 className={`text-[1.05rem] font-bold mt-1 ${styles.textStrongest}`}>Vaqt bo&apos;yicha holat ko&apos;rish</h2>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className={`text-[0.78rem] font-mono ${fetchError ? styles.textDanger : styles.textMuted}`}>
            {fetchError ? fetchError : `${archiveList.length} ta yozuv`}
          </span>
          {isArchiveMode && (
            <button type="button" onClick={onRealtime} className={styles.btn}>
              <span className={`w-1.5 h-1.5 rounded-full ${styles.bgOk}`} />
              Live rejim
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-4 items-end flex-wrap mb-5">
        <div className="flex-1 min-w-[220px]">
          <label className={`block text-[0.84rem] mb-1.5 ${styles.textSky2}`}>Vaqtni tanlang</label>
          <input
            type="datetime-local"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className={styles.inputFlat}
          />
        </div>
        <button type="button" onClick={handleShow} className={styles.btn}>
          Ko&apos;rsat
        </button>
      </div>
      {notice && <p className={`text-[0.85rem] mb-4 -mt-2 ${styles.textWarn}`}>{notice}</p>}

      <table className={`w-full border-collapse text-[0.92rem] ${styles.textSky2}`}>
        <thead>
          <tr className={`border-b ${styles.borderLine}`} style={{ borderBottomWidth: 1 }}>
            {['Signal', 'Holat', 'Vaqt', 'Qurilma'].map((h) => (
              <th key={h} className={`text-left p-2 text-[0.74rem] uppercase tracking-[0.1em] ${styles.textMuted2}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!hasRows ? (
            <tr>
              <td colSpan={4} className={`text-center p-4 ${fetchError ? styles.textDanger : styles.textMuted2}`}>
                {fetchError ? `Xatolik: ${fetchError}` : "Arxiv bo'sh"}
              </td>
            </tr>
          ) : (
            list.map((entry, i) => (
              <tr
                key={`${entry.ts || entry.time}-${entry.name}-${i}`}
                onClick={() => handleRowClick(entry)}
                className={`cursor-pointer border-b ${styles.borderLine}`}
                style={{ borderBottomWidth: 1 }}
              >
                <td className="p-2 font-semibold">{entry.name}</td>
                <td className="p-2">
                  <StateBadge state={entry.state} />
                </td>
                <td className={`p-2 font-mono text-[0.85rem] ${styles.textMuted}`}>{formatTime(entry)}</td>
                <td className={`p-2 text-[0.85rem] ${styles.textMuted2}`}>{entry.device || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
