/* ═══════════════════════════════════════════════════════════════════════
   WorkerComponents — barrel re-export fayli
   
   Barcha komponentlar alohida fayllarga ko'chirildi.
   Bu fayl faqat backward compatibility uchun qoldirildi —
   mavjud `import { X } from '@/components/worker/WorkerComponents'`
   importlari buzilmasdan ishlashda davom etadi.
   ═══════════════════════════════════════════════════════════════════════ */

// Yengil komponentlar (har joyda ishlatiladigan)
export { BigActionCard, HeaderCard } from './BigActionCard'

// Jadval qatorlari (React.memo bilan optimallashtirish)
export { MemoizedJournalRow, LocalTextarea, LocalInput } from './MemoizedJournalRow'

// Og'ir forma komponenti
export { JournalForm } from './JournalForm'

// Grafik va sxema ko'rish
export { WorkerGraphicsView } from './WorkerGraphicsView'
export { WorkerSchemasView } from './WorkerSchemasView'

// Task modal va bajarish modali
export { WorkerTasksModal, TaskCompletionModal } from './WorkerTasksModal'
export type { WorkerTaskItem } from './WorkerTasksModal'
