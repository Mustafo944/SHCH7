import type { LucideIcon } from 'lucide-react';
import { Skull, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import type { IncidentSeverity } from '@/types';

export const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

// Baxtsiz hodisa turlari — eng og'iridan eng yengiligacha tartiblangan.
// Admin (Mehnat muhofazasi) shakli va ishchi/dispetcher ro'yxati bir xil
// nom/rangdan foydalanishi uchun yagona manba shu yerda saqlanadi.
export const INCIDENT_SEVERITY_ORDER: IncidentSeverity[] = ['olim', 'ogir', 'orta_ogir', 'yengil'];

export const INCIDENT_SEVERITY_META: Record<IncidentSeverity, { label: string; badgeClass: string; dotClass: string; cardClass: string; textClass: string; icon: LucideIcon }> = {
  olim: {
    label: "O'lim",
    badgeClass: 'bg-slate-900 text-white border-slate-900',
    dotClass: 'bg-slate-900',
    cardClass: 'border-slate-300 bg-slate-100/50',
    textClass: 'text-slate-900',
    icon: Skull,
  },
  ogir: {
    label: "Og'ir",
    badgeClass: 'bg-red-50 text-red-600 border-red-200',
    dotClass: 'bg-red-500',
    cardClass: 'border-red-100 bg-red-50/30',
    textClass: 'text-red-600',
    icon: AlertOctagon,
  },
  orta_ogir: {
    label: "O'rta og'ir",
    badgeClass: 'bg-orange-50 text-orange-600 border-orange-200',
    dotClass: 'bg-orange-500',
    cardClass: 'border-orange-100 bg-orange-50/30',
    textClass: 'text-orange-600',
    icon: AlertTriangle,
  },
  yengil: {
    label: 'Yengil',
    badgeClass: 'bg-amber-50 text-amber-600 border-amber-200',
    dotClass: 'bg-amber-400',
    cardClass: 'border-amber-100 bg-amber-50/30',
    textClass: 'text-amber-600',
    icon: Info,
  },
};
