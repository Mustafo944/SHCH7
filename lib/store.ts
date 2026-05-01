import { Station } from '@/types';

export const STATIONS: Station[] = [
  { id: "st_1", name: "Malikobod" },
  { id: "st_2", name: "Qizil tepa" },
  { id: "st_3", name: "Elobod" },
  { id: "st_4", name: "To'dako'l" },
  { id: "st_5", name: "Azizobod" },
  { id: "st_6", name: "Farovon" },
  { id: "st_7", name: "Buxoro-1" },
  { id: "st_8", name: "METS" },
  { id: "st_9", name: "Poykent" },
  { id: "st_10", name: "Murg'ak" },
  { id: "st_11", name: "Yakkatut" },
  { id: "st_12", name: "Blokpost" },
  { id: "st_13", name: "Qorako'l" },
  { id: "st_14", name: "Olot" },
  { id: "st_15", name: "Xo'jadavlat" },
  { id: "st_16", name: "Yangiobod" },
  { id: "st_17", name: "Navbahor" },
  { id: "st_18", name: "Yaxshilik" },
  { id: "st_19", name: "Parvoz" },
  { id: "st_20", name: "Qorli tog'" },
  { id: "st_21", name: "Kiyikli" },
  { id: "st_22", name: "Xizrbobo" },
  { id: "st_23", name: "Jayhun" },
  { id: "st_24", name: "Davtepa" },
  { id: "st_25", name: "Turon" },
  { id: "st_26", name: "Kogon" },
  { id: "st_27", name: "Qorovul bozor" },
  { id: "st_28", name: "PPS" },
];

export function getStations(): Station[] {
  return STATIONS;
}

export function getStation(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}
