'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { monosxemaSupabase } from './client'
import { normalizeSignalName } from './signalNames'
import { stationSignalNames } from './stations'
import type { ArchiveEntry, ConnStatus, SignalState, StationDef } from './types'

const ARCHIVE_QUERY_LIMIT = 2000
const POLL_INTERVAL_MS = 4000

function buildInitialStates(station: StationDef): Record<string, SignalState> {
  const out: Record<string, SignalState> = {}
  stationSignalNames(station).forEach((n) => {
    out[normalizeSignalName(n, station.id)] = 'red'
  })
  return out
}

// qorlitog_server loyihasidagi useSignalState.js + useSupabaseSync.js
// bittalashtirilgan holda portlangan — signal holatlari, arxiv, ulanish holati.
export function useLiveSignals(station: StationDef) {
  const initial = useMemo(() => buildInitialStates(station), [station])
  const [signalStates, setSignalStates] = useState<Record<string, SignalState>>(initial)
  const [archiveList, setArchiveList] = useState<ArchiveEntry[]>([])
  const [isArchiveMode, setIsArchiveMode] = useState(false)
  const [connStatus, setConnStatus] = useState<ConnStatus>('connecting')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [devices, setDevices] = useState<Record<string, number>>({})

  const archiveModeRef = useRef(isArchiveMode)
  useEffect(() => {
    archiveModeRef.current = isArchiveMode
  }, [isArchiveMode])

  const applySignalData = useCallback(
    (signals: Record<string, string> | null | undefined) => {
      if (!signals) return
      setSignalStates((prev) => {
        const next = { ...prev }
        Object.entries(signals).forEach(([k, v]) => {
          next[normalizeSignalName(k, station.id)] = v as SignalState
        })
        return next
      })
    },
    [station.id]
  )

  const applySnapshot = useCallback(
    (snapshot: Record<string, string>) => {
      setSignalStates((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((k) => {
          next[k] = 'red'
        })
        Object.entries(snapshot).forEach(([k, v]) => {
          next[normalizeSignalName(k, station.id)] = v as SignalState
        })
        return next
      })
    },
    [station.id]
  )

  const resetToRealtime = useCallback(() => setIsArchiveMode(false), [])
  const setArchiveMode = useCallback((mode: boolean) => setIsArchiveMode(mode), [])

  const touchDevice = useCallback((device: string | null | undefined, updatedAt: string | undefined) => {
    if (!device || !updatedAt) return
    const t = new Date(updatedAt).getTime()
    setDevices((prev) => (prev[device] >= t ? prev : { ...prev, [device]: t }))
  }, [])

  const loadStatus = useCallback(
    async (force = false) => {
      if (!monosxemaSupabase) return
      const { data: signalRows, error: sErr } = await monosxemaSupabase
        .from('signals')
        .select('*')
        .eq('station', station.id)
      if (sErr) {
        setFetchError(sErr.message)
        return
      }

      (signalRows || []).forEach((r: any) => touchDevice(r.device, r.updated_at))
      if (force || !archiveModeRef.current) {
        applySignalData(Object.fromEntries((signalRows || []).map((r: any) => [r.name, r.state])))
      }

      const { data: archiveRows, error: aErr } = await monosxemaSupabase
        .from('archive')
        .select('*')
        .eq('station', station.id)
        .order('ts', { ascending: false })
        .limit(ARCHIVE_QUERY_LIMIT)
      if (aErr) {
        setFetchError(aErr.message)
        return
      }
      setArchiveList(archiveRows || [])
      setFetchError(null)
    },
    [station.id, applySignalData, touchDevice]
  )

  useEffect(() => {
    const supabase = monosxemaSupabase
    if (!supabase) return
    setDevices({})
    setConnStatus('connecting')
    loadStatus()

    const filter = `station=eq.${station.id}`
    const channel = supabase
      .channel(`live-${station.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals', filter }, (payload) => {
        const row = payload.new as any
        if (!row) return
        touchDevice(row.device, row.updated_at)
        if (!archiveModeRef.current) {
          applySignalData({ [row.name]: row.state })
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'archive', filter }, (payload) => {
        setArchiveList((prev) => [payload.new as ArchiveEntry, ...prev])
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnStatus('online')
        else if (['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'].includes(status)) setConnStatus('reconnecting')
      })

    const pollTimer = setInterval(() => loadStatus(), POLL_INTERVAL_MS)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station.id])

  return {
    signalStates,
    archiveList,
    isArchiveMode,
    setArchiveMode,
    resetToRealtime,
    applySnapshot,
    connStatus,
    devices,
    fetchError,
    loadStatus,
  }
}
