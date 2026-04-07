import yillikData from '../yillik.json'
import tortData from '../tort.json'

export interface ParsedTaskItem {
  bolim: string
  ish: string
  davriylik: string
  bajaruvchi: string
  jurnal: string
  nsh: string
  // Modal qidiruv va ko'rsatish uchun aliaslar
  manba: string   // nsh dan olinadi (masalan: "NSH-01", "Tex-karta")
  raqam: string   // nsh dan olinadi (masalan: "7", "8.1")
}

export interface RejaBolimi {
  bolim: string
  ishlar: {
    ish: string
    davriylik: string
    bajaruvchi: string
    jurnal: string
    nsh: string
  }[]
}

export type YillikReja = RejaBolimi[]
export type TortHaftalikReja = RejaBolimi[]

// nsh maydonini parse qilish: "NSH-01 7.1" → { manba: "NSH-01", raqam: "7.1" }
// yoki "Tex-karta №4" → { manba: "Tex-karta", raqam: "4" }
function parseNsh(nsh: string): { manba: string; raqam: string } {
  if (!nsh || nsh.trim() === '') return { manba: '', raqam: '' }

  // "NSH-01 7.1", "NSH-17", "ESSO №6.1", "Tex.karta KSSP№2.2", "Tex-karta №4", "Tex-karta СЦБ №35"
  const trimmed = nsh.trim()

  // "Tex-karta №8", "Tex-karta СЦБ №35"
  const texKartaMatch = trimmed.match(/^(Tex[-.]karta(?:\s+\w+)?)\s*№?\s*(.+)$/i)
  if (texKartaMatch) return { manba: texKartaMatch[1].trim(), raqam: texKartaMatch[2].trim() }

  // "NSH-01 7.1", "NSH-01 8.3.1"
  const nshMatch = trimmed.match(/^(NSH-\d+)\s*(.*)$/)
  if (nshMatch) return { manba: nshMatch[1], raqam: nshMatch[2].trim() }

  // "ESSO №6.1", "ESSO №2.1"
  const essoMatch = trimmed.match(/^(ESSO)\s*№?\s*(.+)$/i)
  if (essoMatch) return { manba: essoMatch[1], raqam: essoMatch[2].trim() }

  // "PU-67"
  const puMatch = trimmed.match(/^(PU-\d+)$/)
  if (puMatch) return { manba: puMatch[1], raqam: '' }

  // "АКТ", "MAXSUS JURNAL", "Jadval", "Sxemalarda belgilanadi", "DU-46,SHU-61"
  return { manba: trimmed, raqam: '' }
}

// Flat versiyalar — barcha ishlar bir qatorda, bolim nomi va parse qilingan nsh bilan
export const YILLIK_REJA_FLAT: ParsedTaskItem[] = yillikData.flatMap((b: RejaBolimi) =>
  b.ishlar.map(ish => {
    const { manba, raqam } = parseNsh(ish.nsh)
    return { ...ish, bolim: b.bolim, manba, raqam }
  })
)

export const TORT_HAFTALIK_REJA_FLAT: ParsedTaskItem[] = tortData.flatMap((b: RejaBolimi) =>
  b.ishlar.map(ish => {
    const { manba, raqam } = parseNsh(ish.nsh)
    return { ...ish, bolim: b.bolim, manba, raqam }
  })
)

// Asl struktura (bolimlar bo'yicha guruhlangan)
export const YILLIK_REJA: YillikReja = yillikData as YillikReja
export const TORT_HAFTALIK_REJA: TortHaftalikReja = tortData as TortHaftalikReja
