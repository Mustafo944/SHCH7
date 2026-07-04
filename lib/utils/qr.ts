// Bekat uskunalari QR kodlari uchun umumiy formatlar.
// StationEquipmentsModal (chop etish), WorkerTasksModal (skanerlash) va
// supabase-db (saqlangan skaner tarixini moslashtirish) bir xil qiymatdan foydalanishi shart.

export function buildEquipmentQrValue(stationId: string, itemId: string): string {
  return `smart-shch-${stationId}-${itemId}`;
}

// Qurilma skanerlari KUNLIK hisoblanadi. Sana qurilmaning MAHALLIY vaqti bo'yicha
// olinishi shart — `toISOString()` UTC qaytaradi va Toshkent (UTC+5) da kun chegarasini
// mahalliy soat 05:00 ga suradi, natijada tunda qilingan skanerlar noto'g'ri kunga tushadi.
// Bu funksiya qurilma soati bo'yicha YYYY-MM-DD qaytaradi.
export function getLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// task_scans jadvalidagi station_id ustuni uuid bo'lgani uchun,
// matnli bekat id'larini (masalan "st_1") deterministik uuid'ga o'giradi.
export function stringToUuid(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex}-0000-4000-8000-000000000000`;
}
