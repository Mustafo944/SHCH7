/**
 * Rol → bosh sahifa xaritasi.
 *
 * Bitta manba: middleware (server), login sahifasi va sessiya qorovuli —
 * hammasi shu yerdan o'qiydi. Ilgari xarita uchta joyda nusxalangan edi va
 * yangi rol qo'shilganda bittasi unutilib qolar edi.
 *
 * Bu modul SOF bo'lishi shart (brauzer/`supabase` importlarisiz) — uni Edge
 * runtime'dagi middleware ham import qiladi.
 */

export const ROLE_HOME: Record<string, string> = {
  dispatcher: '/dispatcher',
  worker: '/worker',
  elektromexanik: '/worker',
  elektromontyor: '/worker',
  katta_elektromexanik: '/worker',
  bekat_boshlighi: '/bekat-boshlighi',
  bekat_navbatchisi: '/bekat-navbatchisi',
  yul_ustasi: '/yul-ustasi',
  ech_xodimi: '/ech-xodimi',
  mehnat_muhofazasi: '/mehnat-muhofazasi',
  texnik_hujjatlar: '/texnik-hujjatlar',
}

/**
 * Klient tomoni uchun: noma'lum rol `/worker`ga tushadi (eski xatti-harakat).
 * Middleware bu funksiyani ISHLATMAYDI — u yerda noma'lum rol `/`ga ketishi
 * kerak, aks holda redirect halqasi hosil bo'ladi.
 */
export function getRoleHome(role?: string | null): string {
  return (role && ROLE_HOME[role]) || '/worker'
}
