// Bekat uskunalari QR kodlari uchun umumiy formatlar.
// StationEquipmentsModal (chop etish), WorkerTasksModal (skanerlash) va
// supabase-db (saqlangan skaner tarixini moslashtirish) bir xil qiymatdan foydalanishi shart.

export function buildEquipmentQrValue(stationId: string, itemId: string): string {
  return `smart-shch-${stationId}-${itemId}`;
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
