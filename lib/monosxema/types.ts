// Qorli Tog' / Poykent monosxema monitoring — umumiy tiplar.
// Geometriya tiplari lib/monosxema/stations/*.ts fayllaridan keladi.

export type SignalState = 'green' | 'red'

export interface TrackSwitchPoint {
  at: number
  sw: string
}

export interface TrackDef {
  name: string
  left: number
  top: number
  w: number
  bg?: string
  rot?: string
  sw?: string
  pathType?: 'straight' | 'side'
  switchPoints?: TrackSwitchPoint[]
  reverse?: boolean
}

export interface SignalDef {
  name: string
  sigLeft: number
  sigTop: number
  labelLeft: number
  labelTop: number
  display: string
  type?: 'signal-arrow' | 'signal-square' | ''
}

export interface SwitchDef {
  name: string
  display: string
  colorType: 'green' | 'yellow'
  sigLeft: number
  sigTop: number
  labelLeft: number
  labelTop: number
}

export interface SwitchLabelDef {
  text: string
  left: number
  top: number
}

export interface SectionDef {
  name: string
  left: number
  top: number
  label: string
}

export interface IzostikDef {
  left: number
  top: number
  h: number
}

export interface CrossingDef {
  left: number
  top?: number
  h?: number
  w?: number
}

export interface StationDef {
  id: 'qorlitog' | 'poykent'
  name: string
  subtitle: string
  width: number
  height: number
  leftLabel: string
  rightLabel: string
  leftLabelX?: number
  rightLabelX?: number
  layoutReady: boolean
  archiveMarker: { left: number | string; transform?: string }
  tracks: TrackDef[]
  izostik: IzostikDef[]
  crossings: CrossingDef[]
  signals: SignalDef[]
  switches: SwitchDef[]
  switchLabels: SwitchLabelDef[]
  sections: SectionDef[]
  trackCount: number
  voltageSections: string[]
  devices: string[]
}

export interface ArchiveEntry {
  id?: number
  station: string
  name: string
  state: SignalState
  device?: string | null
  ts: number
  time?: string
  created_at?: string
}

export interface RailVoltageRow {
  station: string
  name: string
  power_voltage: number | null
  relay_voltage: number | null
  device?: string | null
  updated_at?: string
}

export interface RailVoltageLimit {
  station: string
  name: string
  relay_high: number | null
  relay_low: number | null
}

export interface RailVoltageAlarm {
  id: number
  station: string
  name: string
  side: 'power' | 'relay'
  event: 'high_start' | 'high_end' | 'low_start' | 'low_end'
  voltage: number | null
  device?: string | null
  ts: string
}

export type ConnStatus = 'connecting' | 'online' | 'reconnecting'
