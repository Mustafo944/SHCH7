'use client'

import { useEffect, useState } from 'react'
import { monosxemaSupabase } from './client'
import { normalizeSignalName } from './signalNames'
import type { RailVoltageAlarm, RailVoltageLimit, RailVoltageRow, StationDef } from './types'

const POLL_INTERVAL_MS = 5000

// qorlitog_server loyihasidagi RailVoltageModal.jsx ichidagi ma'lumot yuklash
// mantig'i portlangan — rels zanjirlari kuchlanishi + ogohlantirishlar tarixi.
export function useRailVoltage(station: StationDef) {
  const [rows, setRows] = useState<Record<string, RailVoltageRow>>({})
  const [limits, setLimits] = useState<Record<string, RailVoltageLimit>>({})
  const [alarms, setAlarms] = useState<RailVoltageAlarm[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = monosxemaSupabase
    if (!supabase) return
    let disposed = false
    const stationId = station.id

    const load = async () => {
      const [{ data: voltData, error: voltErr }, { data: limitData, error: limitErr }] = await Promise.all([
        supabase.from('rail_voltages').select('*').eq('station', stationId),
        supabase.from('rail_voltage_limits').select('*').eq('station', stationId),
      ])
      if (disposed) return
      if (voltErr) {
        setError(voltErr.message)
        return
      }
      const map: Record<string, RailVoltageRow> = {}
      ;(voltData || []).forEach((r: RailVoltageRow) => {
        map[normalizeSignalName(r.name, stationId)] = r
      })
      setRows(map)
      if (!limitErr) {
        const lmap: Record<string, RailVoltageLimit> = {}
        ;(limitData || []).forEach((l: RailVoltageLimit) => {
          lmap[normalizeSignalName(l.name, stationId)] = l
        })
        setLimits(lmap)
      }
      setError(null)
    }

    const loadAlarms = async () => {
      const { data } = await supabase
        .from('rail_voltage_archive')
        .select('*')
        .eq('station', stationId)
        .order('ts', { ascending: false })
        .limit(50)
      if (disposed) return
      if (data) setAlarms(data)
    }

    load()
    loadAlarms()

    const filter = `station=eq.${stationId}`
    const channel = supabase
      .channel(`rail-voltage-${stationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rail_voltages', filter }, (payload) => {
        const row = payload.new as RailVoltageRow
        if (!row) return
        setRows((prev) => ({ ...prev, [normalizeSignalName(row.name, stationId)]: row }))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rail_voltage_archive', filter }, (payload) => {
        const row = payload.new as RailVoltageAlarm
        if (!row) return
        setAlarms((prev) => [row, ...prev].slice(0, 50))
      })
      .subscribe()

    const pollTimer = setInterval(() => {
      load()
      loadAlarms()
    }, POLL_INTERVAL_MS)

    return () => {
      disposed = true
      supabase.removeChannel(channel)
      clearInterval(pollTimer)
    }
  }, [station.id])

  const sectionNames = (station.voltageSections || []).map((n) => normalizeSignalName(n, station.id))

  return { rows, limits, alarms, error, sectionNames }
}
