import type { StationDef } from '../types'
import qorlitog from './qorlitog'
import poykent from './poykent'

export const STATIONS: StationDef[] = [qorlitog, poykent]

export function getStation(id: string): StationDef | null {
  return STATIONS.find((s) => s.id === id) || null
}

// shch7'dagi bekat nomini monosxema loyihasi stansiya id'siga bog'lash.
// Faqat shu ikkita bekatda ESP32 monitoring o'rnatilgan.
const NAME_TO_STATION_ID: Record<string, StationDef['id']> = {
  "qorli tog'": 'qorlitog',
  'poykent': 'poykent',
}

export function getMonitorStationForName(stationName: string | null | undefined): StationDef | null {
  if (!stationName) return null
  const id = NAME_TO_STATION_ID[stationName.trim().toLowerCase()]
  return id ? getStation(id) : null
}

// Stansiyaning barcha signal nomlari (seksiya, yo'l bo'lagi, svetofor, strelka).
export function stationSignalNames(station: StationDef): string[] {
  const names = new Set<string>()
  station.sections.forEach((s) => names.add(s.name))
  station.tracks.forEach((t) => names.add(t.name))
  station.signals.forEach((s) => names.add(s.name))
  station.switches.forEach((s) => names.add(s.name))
  return Array.from(names)
}

// Asosiy (kirish-chiqish) svetoforlar — type'i bo'lmaganlar (ПС/ПП, КП, ДСО/ПП kabi
// ikki holatli xizmat indikatorlari bu hisobga kirmaydi).
export function stationMainSignalNames(station: StationDef): string[] {
  return station.signals.filter((s) => !s.type).map((s) => s.name)
}
