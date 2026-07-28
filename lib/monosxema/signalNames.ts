// Signal nomlarini kanonik ko'rinishga keltirish — qorlitog_server loyihasidan
// portlangan (src/utils/signalNames.js). Qoida STANSIYAGA QARAB har xil:
//   qorlitog: 'Н'/'H' -> lotin 'N'  (kanonik nom: '1NП', 'N1', 'ПС/ПП_N')
//   poykent:  lotin 'H' -> kirill 'Н' (kanonik nom TO'LIQ KIRILL: 'НДП', 'Н1')

const QORLITOG_MAP: Record<string, string> = {
  'Н': 'N',
  'H': 'N',
  'C': 'С',
  'A': 'А',
  'K': 'К',
  'M': 'М',
  'P': 'П',
}

const POYKENT_MAP: Record<string, string> = {
  'H': 'Н',
  'C': 'С',
  'A': 'А',
  'K': 'К',
  'M': 'М',
  'P': 'П',
}

const MAPS: Record<string, Record<string, string>> = {
  qorlitog: QORLITOG_MAP,
  poykent: POYKENT_MAP,
}

export const DEFAULT_STATION_ID = 'qorlitog'

const PATTERNS: Record<string, RegExp> = Object.fromEntries(
  Object.entries(MAPS).map(([id, map]) => [id, new RegExp(`[${Object.keys(map).join('')}]`, 'g')])
)

export function normalizeSignalName(name: string | null | undefined, stationId: string = DEFAULT_STATION_ID): string {
  if (name === null || name === undefined) return ''
  const map = MAPS[stationId] || MAPS[DEFAULT_STATION_ID]
  const re = PATTERNS[stationId] || PATTERNS[DEFAULT_STATION_ID]
  return String(name).trim().replace(re, (ch) => map[ch] || ch)
}
