import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Edit3, Plus, Trash2, Printer, Download, AlertTriangle, Loader2, ArrowRightLeft, Target, ChevronLeft, ChevronRight, Clock, History } from 'lucide-react';
import { StationEquipments, EquipmentCategory } from '@/types';
import { getStationEquipments, upsertStationEquipments, getStationTaskScans, type TaskScan } from '@/lib/supabase-db';
import { useToast } from '@/lib/hooks/useToast';
import useSWR from 'swr';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { TORT_HAFTALIK_REJA_FLAT, YILLIK_REJA_FLAT, TORT_HAFTALIK_REJA, YILLIK_REJA, taskDisplayKey } from '@/lib/reja-data';
import { TaskQRMapping } from '@/types';
import { buildEquipmentQrValue } from '@/lib/utils/qr';

interface CategoryColorStyle {
  gradient: string;
  btnText: string;
  dot: string;
  hoverBorder: string;
  activeBorder: string;
  iconText: string;
  iconBg: string;
}

const COLOR_STYLES: Record<string, CategoryColorStyle> = {
  blue: { gradient: 'from-blue-500 to-blue-600 shadow-blue-500/20', btnText: 'text-blue-600 hover:text-blue-700 bg-blue-50 border-blue-100', dot: 'bg-blue-500', hoverBorder: 'hover:border-blue-200', activeBorder: 'border-blue-500 bg-blue-50', iconText: 'text-blue-500', iconBg: 'bg-blue-100 text-blue-600' },
  emerald: { gradient: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20', btnText: 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500', hoverBorder: 'hover:border-emerald-200', activeBorder: 'border-emerald-500 bg-emerald-50', iconText: 'text-emerald-500', iconBg: 'bg-emerald-100 text-emerald-600' },
  orange: { gradient: 'from-orange-500 to-orange-600 shadow-orange-500/20', btnText: 'text-orange-600 hover:text-orange-700 bg-orange-50 border-orange-100', dot: 'bg-orange-500', hoverBorder: 'hover:border-orange-200', activeBorder: 'border-orange-500 bg-orange-50', iconText: 'text-orange-500', iconBg: 'bg-orange-100 text-orange-600' },
  purple: { gradient: 'from-purple-500 to-purple-600 shadow-purple-500/20', btnText: 'text-purple-600 hover:text-purple-700 bg-purple-50 border-purple-100', dot: 'bg-purple-500', hoverBorder: 'hover:border-purple-200', activeBorder: 'border-purple-500 bg-purple-50', iconText: 'text-purple-500', iconBg: 'bg-purple-100 text-purple-600' },
  rose: { gradient: 'from-rose-500 to-rose-600 shadow-rose-500/20', btnText: 'text-rose-600 hover:text-rose-700 bg-rose-50 border-rose-100', dot: 'bg-rose-500', hoverBorder: 'hover:border-rose-200', activeBorder: 'border-rose-500 bg-rose-50', iconText: 'text-rose-500', iconBg: 'bg-rose-100 text-rose-600' },
  cyan: { gradient: 'from-cyan-500 to-cyan-600 shadow-cyan-500/20', btnText: 'text-cyan-600 hover:text-cyan-700 bg-cyan-50 border-cyan-100', dot: 'bg-cyan-500', hoverBorder: 'hover:border-cyan-200', activeBorder: 'border-cyan-500 bg-cyan-50', iconText: 'text-cyan-500', iconBg: 'bg-cyan-100 text-cyan-600' },
  indigo: { gradient: 'from-indigo-500 to-indigo-600 shadow-indigo-500/20', btnText: 'text-indigo-600 hover:text-indigo-700 bg-indigo-50 border-indigo-100', dot: 'bg-indigo-500', hoverBorder: 'hover:border-indigo-200', activeBorder: 'border-indigo-500 bg-indigo-50', iconText: 'text-indigo-500', iconBg: 'bg-indigo-100 text-indigo-600' },
  teal: { gradient: 'from-teal-500 to-teal-600 shadow-teal-500/20', btnText: 'text-teal-600 hover:text-teal-700 bg-teal-50 border-teal-100', dot: 'bg-teal-500', hoverBorder: 'hover:border-teal-200', activeBorder: 'border-teal-500 bg-teal-50', iconText: 'text-teal-500', iconBg: 'bg-teal-100 text-teal-600' },
  pink: { gradient: 'from-pink-500 to-pink-600 shadow-pink-500/20', btnText: 'text-pink-600 hover:text-pink-700 bg-pink-50 border-pink-100', dot: 'bg-pink-500', hoverBorder: 'hover:border-pink-200', activeBorder: 'border-pink-500 bg-pink-50', iconText: 'text-pink-500', iconBg: 'bg-pink-100 text-pink-600' },
};

function colorStyle(color: string): CategoryColorStyle {
  return COLOR_STYLES[color] || COLOR_STYLES.blue;
}

// Skaner sana/vaqtini butun modal bo'ylab bir xil formatda ko'rsatish uchun
function formatScanDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Eski ma'lumotlarda equipmentType bitta string edi (masalan "machtali"),
// yangi formatda esa massiv (bir nechta toifa bog'lanishi mumkin). Ikkalasini
// ham to'g'ri o'qish uchun har doim massivga normalizatsiya qilamiz.
function normalizeTaskMappings(mappings: TaskQRMapping[] | undefined): TaskQRMapping[] {
  return (mappings || []).map(m => ({
    ...m,
    equipmentType: Array.isArray(m.equipmentType) ? m.equipmentType : [m.equipmentType].filter(Boolean),
  }));
}

function CategoryAvatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-10 w-10 text-base' : size === 'lg' ? 'h-14 w-14 text-xl' : 'h-12 w-12 text-lg';
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-black text-white shadow-md ${colorStyle(color).gradient} ${sizeClass}`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function EmptyHint({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
        <Icon size={28} />
      </div>
      <p className="text-sm font-bold uppercase tracking-widest text-slate-400">{text}</p>
    </div>
  );
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-1 flex items-center gap-3">
      <button onClick={onBack} className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50">
        <ChevronLeft size={18} />
      </button>
      <h3 className="truncate text-base font-black tracking-tight text-slate-900">{title}</h3>
    </div>
  );
}

function DebouncedInput({ value, onChange, placeholder, className }: { value: string, onChange: (val: string) => void, placeholder: string, className: string }) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleBlur = () => {
    if (localVal !== value) {
      onChange(localVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onChange(localVal);
    }
  };

  return (
    <input
      type="text"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
}

interface Props {
  stationId: string;
  stationName: string;
  canEdit: boolean; // Katta elektromexanik bo'lsa true — uskunalar ro'yxatini tahrirlash shu rolga tegishli
  isDispatcher?: boolean; // Aloqa dispetcheri bo'lsa true — "QR Chop etish" faqat shu rolga ko'rinadi
  canEditTaskMappings?: boolean; // Katta elektromexanik bo'lsa true — "QR kodni bog'lash" faqat shu rolga ko'rinadi
  userName: string;
  onClose: () => void;
}

export function StationEquipmentsModal({ stationId, stationName, canEdit, isDispatcher = false, canEditTaskMappings = false, userName, onClose }: Props) {
  const toast = useToast();
  const { data: swrData, isLoading, mutate } = useSWR(
    `equipments_${stationId}`,
    () => getStationEquipments(stationId),
    {
      revalidateOnFocus: false, // Don't refetch on window focus to prevent overriding edits
      dedupingInterval: 60000, // 1 minute cache
    }
  );

  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingMappings, setIsEditingMappings] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const [equipments, setEquipments] = useState<StationEquipments | null>(null);

  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [taskMappings, setTaskMappings] = useState<TaskQRMapping[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteConfirmCategoryId, setDeleteConfirmCategoryId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'equipments' | 'tasks' | 'history'>('equipments');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPlanType, setSelectedPlanType] = useState<'tort' | 'yillik' | null>(null);
  const [selectedTaskNsh, setSelectedTaskNsh] = useState<string | null>(null);
  const [selectedBolim, setSelectedBolim] = useState<number | null>(null);

  // Skaner tarixi — uch bosqichli navigatsiya: Toifa → Uskuna → Skaner tarixi
  const [selectedHistoryCategoryId, setSelectedHistoryCategoryId] = useState<string | null>(null);
  const [selectedHistoryItemId, setSelectedHistoryItemId] = useState<string | null>(null);

  // QR chop etish — xuddi shu naqshdagi uch bosqichli navigatsiya: Toifa → Uskuna → bitta QR kod
  const [selectedPrintCategoryId, setSelectedPrintCategoryId] = useState<string | null>(null);
  const [selectedPrintItemId, setSelectedPrintItemId] = useState<string | null>(null);

  const { data: scanHistory, isLoading: isScanHistoryLoading } = useSWR(
    activeTab === 'history' ? `scan_history_${stationId}` : null,
    () => getStationTaskScans(stationId),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // Xom QR qiymatini ("smart-shch-...") uskunaning o'qiladigan nomi va toifasiga moslashtiramiz
  const equipmentMetaByQr = useMemo(() => {
    const map = new Map<string, { name: string; categoryId: string }>();
    categories.forEach(cat => (cat.items || []).forEach(item => {
      map.set(buildEquipmentQrValue(stationId, item.id), { name: item.name, categoryId: cat.id });
    }));
    return map;
  }, [categories, stationId]);

  // Skanerlarni uskuna bo'yicha guruhlaymiz (so'rov allaqachon eng yangisidan eskisiga saralangan)
  const scansByEquipmentQr = useMemo(() => {
    const map = new Map<string, TaskScan[]>();
    (scanHistory || []).forEach(scan => {
      const list = map.get(scan.equipment_name);
      if (list) list.push(scan);
      else map.set(scan.equipment_name, [scan]);
    });
    return map;
  }, [scanHistory]);

  const scanCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    scansByEquipmentQr.forEach((scans, qr) => {
      const meta = equipmentMetaByQr.get(qr);
      if (meta) counts.set(meta.categoryId, (counts.get(meta.categoryId) || 0) + scans.length);
    });
    return counts;
  }, [scansByEquipmentQr, equipmentMetaByQr]);

  const selectedHistoryCategory = useMemo(
    () => categories.find(c => c.id === selectedHistoryCategoryId) || null,
    [categories, selectedHistoryCategoryId]
  );

  const historyCategoryItems = useMemo(() => {
    if (!selectedHistoryCategory) return [];
    return (selectedHistoryCategory.items || []).map(item => {
      const scans = scansByEquipmentQr.get(buildEquipmentQrValue(stationId, item.id)) || [];
      return { item, scanCount: scans.length, lastScan: scans[0] || null };
    });
  }, [selectedHistoryCategory, scansByEquipmentQr, stationId]);

  const selectedHistoryItem = useMemo(
    () => (selectedHistoryCategory?.items || []).find(i => i.id === selectedHistoryItemId) || null,
    [selectedHistoryCategory, selectedHistoryItemId]
  );

  const selectedHistoryItemScans = useMemo(() => {
    if (!selectedHistoryItem) return [];
    return scansByEquipmentQr.get(buildEquipmentQrValue(stationId, selectedHistoryItem.id)) || [];
  }, [scansByEquipmentQr, stationId, selectedHistoryItem]);

  const openHistoryTab = () => {
    setActiveTab('history');
    setSelectedHistoryCategoryId(null);
    setSelectedHistoryItemId(null);
  };
  const backToHistoryCategories = () => { setSelectedHistoryCategoryId(null); setSelectedHistoryItemId(null); };
  const backToHistoryItems = () => setSelectedHistoryItemId(null);

  const selectedPrintCategory = useMemo(
    () => categories.find(c => c.id === selectedPrintCategoryId) || null,
    [categories, selectedPrintCategoryId]
  );
  const selectedPrintItem = useMemo(
    () => (selectedPrintCategory?.items || []).find(i => i.id === selectedPrintItemId) || null,
    [selectedPrintCategory, selectedPrintItemId]
  );
  const openPrintingView = () => {
    setIsPrinting(true);
    setSelectedPrintCategoryId(null);
    setSelectedPrintItemId(null);
  };
  const handlePrintBack = () => {
    if (selectedPrintItemId) setSelectedPrintItemId(null);
    else if (selectedPrintCategoryId) setSelectedPrintCategoryId(null);
    else setIsPrinting(false);
  };

  // Modal ochiq turganda orqadagi sahifa scroll bo'lib, ikkalasi bir vaqtda tortilib friz bo'lib ko'rinishining oldini oladi
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  useEffect(() => {
    if (swrData && !isEditing && !isEditingMappings) {
      setEquipments(swrData);
      setCategories(swrData.categories || []);
      setTaskMappings(normalizeTaskMappings(swrData.taskMappings));
    }
  }, [swrData, isEditing, isEditingMappings]);

  const [saveWarning, setSaveWarning] = useState<{ prevItems: number; nextItems: number; prevMappings: number; nextMappings: number } | null>(null);

  const countItems = (cats: EquipmentCategory[]) => cats.reduce((sum, c) => sum + (c.items || []).length, 0);

  // Oldingi (serverdagi so'nggi ma'lumot) bilan solishtirganda katta qismi o'chirilayotgan bo'lsa — chindan shuni xohlaysizmi, deb so'raymiz
  const isMassDeletion = (prev: number, next: number) => prev > 0 && (next === 0 || next <= prev / 2);

  const performSave = async () => {
    setSaving(true);
    try {
      // Filtrlash: faqat bo'sh bo'lmagan qatorlar
      const cleanCategories = categories.map(c => ({
        ...c,
        items: (c.items || []).filter(item => item && item.name && item.name.trim() !== '')
      }));

      const data = await upsertStationEquipments(stationId, cleanCategories, taskMappings, userName, equipments?.updatedAt ?? null);
      if (data) {
        toast.success("O'zgarishlar muvaffaqiyatli saqlandi!");
        setIsEditing(false);
        setIsEditingMappings(false);
        mutate(data); // Keshni yangilaymiz
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Saqlashda xatolik';
      if (message.startsWith('CONFLICT:')) {
        toast.error(message.replace('CONFLICT: ', ''));
        // Tahrirlash rejimidan chiqamiz — shu bilan effekt eng so'nggi server holatini
        // qayta yuklaydi (aks holda keyingi urinish ham eskirgan updatedAt bilan yana ziddiyatga uchraydi)
        setIsEditing(false);
        setIsEditingMappings(false);
        mutate();
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const cleanCategories = categories.map(c => ({
      ...c,
      items: (c.items || []).filter(item => item && item.name && item.name.trim() !== '')
    }));
    const prevItems = countItems(equipments?.categories || []);
    const nextItems = countItems(cleanCategories);
    const prevMappings = (equipments?.taskMappings || []).length;
    const nextMappings = taskMappings.length;

    if (isMassDeletion(prevItems, nextItems) || isMassDeletion(prevMappings, nextMappings)) {
      setSaveWarning({ prevItems, nextItems, prevMappings, nextMappings });
      return;
    }
    await performSave();
  };

  const addItem = (categoryId: string) => {
    setCategories(prev => prev.map(c =>
      c.id === categoryId ? { ...c, items: [...(c.items || []), { id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`, name: '' }] } : c
    ));
  };

  const updateItem = (categoryId: string, itemId: string, name: string) => {
    setCategories(prev => prev.map(c =>
      c.id === categoryId ? { ...c, items: (c.items || []).map(item => item.id === itemId ? { ...item, name } : item) } : c
    ));
  };

  const removeItem = (categoryId: string, itemId: string) => {
    setCategories(prev => prev.map(c =>
      c.id === categoryId ? { ...c, items: (c.items || []).filter(item => item.id !== itemId) } : c
    ));
  };

  const removeCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    // Shu toifaga bog'langan QR vazifa moslashuvlaridan uni olib tashlaymiz —
    // agar boshqa toifa qolmasa, butun moslashuv o'chiriladi ("osilib qolgan" havola qolmasligi uchun)
    setTaskMappings(prev => prev
      .map(m => ({ ...m, equipmentType: m.equipmentType.filter(id => id !== categoryId) }))
      .filter(m => m.equipmentType.length > 0));
    setDeleteConfirmCategoryId(null);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const colors = ['blue', 'emerald', 'orange', 'purple', 'rose', 'cyan', 'indigo', 'teal', 'pink'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newCat: EquipmentCategory = {
      id: `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: newCategoryName,
      color: randomColor,
      items: []
    };
    setCategories([...categories, newCat]);
    setNewCategoryName('');
  };

  const handleDownloadSingleQr = async (item: { id: string; name: string }, categoryName: string) => {
    setIsDownloadingPdf(true);
    try {
      const qrCanvas = document.getElementById(`qr-pdf-canvas-${item.id}`) as HTMLCanvasElement | null;
      if (!qrCanvas) throw new Error('QR kod topilmadi');
      const qrDataUrl = qrCanvas.toDataURL('image/png');

      // "№" kabi belgilar jsPDF ning standart shriftida (WinAnsi) yo'q va "!" bo'lib chiqadi.
      // Shuning uchun matnni jsPDF shrifti bilan emas, brauzer canvas'ida chizib, rasm sifatida
      // PDF'ga qo'shamiz — canvas har qanday Unicode belgini (shu jumladan №) to'g'ri chizadi
      const wrapCanvasText = (ctx2d: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let current = '';
        words.forEach(word => {
          const test = current ? `${current} ${word}` : word;
          if (current && ctx2d.measureText(test).width > maxWidth) {
            lines.push(current);
            current = word;
          } else {
            current = test;
          }
        });
        if (current) lines.push(current);
        return lines;
      };

      const labelWidthPx = 900;
      const maxTextWidth = labelWidthPx - 80;
      const measureCtx = document.createElement('canvas').getContext('2d');
      if (!measureCtx) throw new Error('Canvas ochilmadi');

      // Uzoq nomlar bir qatorga sig'may qolsa avval qatorlarga bo'linadi, hali ham sig'masa
      // shrift kichraytiriladi — nom hech qachon canvas chetidan chiqib ketmasligi uchun
      let itemFontSize = 84;
      measureCtx.font = `bold ${itemFontSize}px Arial, sans-serif`;
      let nameLines = wrapCanvasText(measureCtx, item.name, maxTextWidth);
      if (nameLines.length > 2) {
        itemFontSize = 56;
        measureCtx.font = `bold ${itemFontSize}px Arial, sans-serif`;
        nameLines = wrapCanvasText(measureCtx, item.name, maxTextWidth);
      }

      // Toifa nomi ham qurilma nomi bilan bir xil kattalikda chiziladi
      let categoryFontSize = 84;
      measureCtx.font = `bold ${categoryFontSize}px Arial, sans-serif`;
      let categoryLines = wrapCanvasText(measureCtx, categoryName.toUpperCase(), maxTextWidth);
      if (categoryLines.length > 2) {
        categoryFontSize = 56;
        measureCtx.font = `bold ${categoryFontSize}px Arial, sans-serif`;
        categoryLines = wrapCanvasText(measureCtx, categoryName.toUpperCase(), maxTextWidth);
      }

      const stationFontSize = 40;
      const topPad = 55;
      const stationGap = 45;
      const itemLineHeight = itemFontSize * 1.15;
      const categoryGap = 45;
      const categoryLineHeight = categoryFontSize * 1.15;
      const bottomPad = 20;
      const labelHeightPx = Math.round(topPad + stationGap + nameLines.length * itemLineHeight + categoryGap + categoryLines.length * categoryLineHeight + bottomPad);

      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = labelWidthPx;
      labelCanvas.height = labelHeightPx;
      const ctx = labelCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas ochilmadi');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
      ctx.textAlign = 'center';

      ctx.fillStyle = '#1a1a1a';
      ctx.font = `bold ${stationFontSize}px Arial, sans-serif`;
      ctx.fillText(stationName, labelCanvas.width / 2, topPad);

      ctx.font = `bold ${itemFontSize}px Arial, sans-serif`;
      nameLines.forEach((line, i) => {
        ctx.fillText(line, labelCanvas.width / 2, topPad + stationGap + itemLineHeight * (i + 0.75));
      });

      ctx.fillStyle = '#787878';
      ctx.font = `bold ${categoryFontSize}px Arial, sans-serif`;
      categoryLines.forEach((line, i) => {
        ctx.fillText(line, labelCanvas.width / 2, topPad + stationGap + nameLines.length * itemLineHeight + categoryGap + categoryLineHeight * (i + 0.75));
      });

      const labelDataUrl = labelCanvas.toDataURL('image/png');

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const qrSize = 150;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 35;

      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      const labelWidth = 150;
      const labelHeight = labelWidth * (labelCanvas.height / labelCanvas.width);
      doc.addImage(labelDataUrl, 'PNG', (pageWidth - labelWidth) / 2, qrY + qrSize + 6, labelWidth, labelHeight);

      doc.save(`${stationName}_${item.name}_QR.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PDF yuklab olishda xatolik');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Chop etish sahifasi — uch bosqichli navigatsiya: Toifa → Uskuna → bitta QR kod
  if (isPrinting) {
    const printTitle = selectedPrintItem
      ? `${selectedPrintItem.name} - QR kod`
      : selectedPrintCategory
        ? `${selectedPrintCategory.name} - Qurilmalar`
        : `${stationName} - Toifalar`;

    return (
      <div className="fixed inset-0 z-[10000] bg-white overflow-y-auto">
        <div className="flex flex-col gap-3 p-4 border-b border-slate-200 bg-slate-50 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-slate-800 sm:text-xl truncate">{printTitle}</h2>
          <div className="flex gap-2 sm:gap-4">
            <button onClick={handlePrintBack} className="flex-1 px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-100 sm:flex-none">Orqaga</button>
            {selectedPrintItem && selectedPrintCategory && (
              <>
                <button onClick={() => handleDownloadSingleQr(selectedPrintItem, selectedPrintCategory.name)} disabled={isDownloadingPdf} className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 sm:flex-none sm:px-6">
                  {isDownloadingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} {isDownloadingPdf ? 'Tayyorlanmoqda...' : 'Yuklab olish'}
                </button>
                <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 sm:flex-none sm:px-6">
                  <Printer size={18} /> Chop etish
                </button>
              </>
            )}
          </div>
        </div>

        {/* BOSQICH 1 va 2 — Toifa va uskuna tanlash (faqat ekranda, chop etilmaydi) */}
        {!selectedPrintItem && (
          <div className="p-4 max-w-3xl mx-auto sm:p-8 print:hidden">
            {!selectedPrintCategory ? (
              categories.length === 0 ? (
                <EmptyHint icon={Printer} text="Hali toifa qo'shilmagan" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedPrintCategoryId(category.id)}
                      className="premium-card flex items-center gap-4 p-4 sm:p-5 text-left"
                    >
                      <CategoryAvatar name={category.name} color={category.color} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-900 tracking-tight truncate">{category.name || 'Nomsiz toifa'}</h4>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{(category.items || []).length} ta qurilma</p>
                      </div>
                      <ChevronRight size={20} className="shrink-0 text-slate-300" />
                    </button>
                  ))}
                </div>
              )
            ) : (
              (selectedPrintCategory.items || []).length === 0 ? (
                <EmptyHint icon={Printer} text="Bu toifada qurilma yo'q" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(selectedPrintCategory.items || []).map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedPrintItemId(item.id)}
                      className="premium-card flex items-center justify-between gap-2 p-4 text-left"
                    >
                      <span className="font-bold text-slate-800 truncate">{item.name}</span>
                      <ChevronRight size={18} className="shrink-0 text-slate-300" />
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* BOSQICH 3 — Tanlangan uskunaning QR kodi (chop etiladigan qism) */}
        {selectedPrintItem && selectedPrintCategory && (
          <div id="qr-print-content" className="flex items-center justify-center p-4 sm:p-8 print:p-8">
            <div className="flex w-full max-w-md min-w-0 flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-2xl sm:p-12 print:p-8 print:border-4">
              <QRCodeSVG value={buildEquipmentQrValue(stationId, selectedPrintItem.id)} size={280} />
              <span className="mt-4 font-black text-sm text-center">{stationName}</span>
              <span className="font-black text-4xl sm:text-5xl text-center mt-2 break-words">{selectedPrintItem.name}</span>
              <span className="font-black text-4xl sm:text-5xl text-slate-500 mt-3 uppercase text-center break-words">{selectedPrintCategory.name}</span>
            </div>
          </div>
        )}

        {/* PDF eksport uchun ko'rinmas canvas QR kodlar — jsPDF addImage PNG dataURL talab qiladi, SVG emas */}
        <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
          {categories.map(category => (
            (category.items || []).map(item => (
              <QRCodeCanvas key={item.id} id={`qr-pdf-canvas-${item.id}`} value={buildEquipmentQrValue(stationId, item.id)} size={600} />
            ))
          ))}
        </div>

        {/* CSS for print — #qr-print-content ID orqali aniq maqsadga mo'ljallangan (avvalgi
            ".fixed > div:last-child" strukturaviy tanlagichi shu divdan keyin qo'shilgan
            <style> elementi tufayli hech qachon mos kelmas edi, buning ustiga scope qilinmagan
            ".fixed { position: static }" qoidasi sahifadagi BOSHQA "fixed" klassli elementlarni
            ham chop etishga chiqarib yuborishi mumkin edi). */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body * { visibility: hidden; }
            #qr-print-content, #qr-print-content * { visibility: visible; }
            #qr-print-content { position: fixed !important; left: 0; top: 0; width: 100%; }
            .page-break-inside-avoid { page-break-inside: avoid; }
          }
        `}} />
      </div>
    );
  }

  // "QR kodni bog'lash" faqat Katta elektromexanikka ko'rinadi
  const tabs: { id: 'equipments' | 'tasks' | 'history'; label: string; onClick: () => void }[] = [
    { id: 'equipments', label: "Uskunalar ro'yxati va QR", onClick: () => setActiveTab('equipments') },
    ...(canEditTaskMappings ? [{ id: 'tasks' as const, label: "QR kodni bog'lash", onClick: () => { setActiveTab('tasks'); setSelectedPlanType(null); setSelectedTaskNsh(null); } }] : []),
    { id: 'history', label: 'Skaner tarixi', onClick: openHistoryTab },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-2 sm:p-4 backdrop-blur-md">
      <div className="flex h-[95vh] sm:h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl sm:rounded-[32px] border border-white/60 bg-white/60 shadow-2xl backdrop-blur-xl">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between border-b border-white/60 px-4 py-4 sm:px-8 sm:py-6 gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 break-words leading-tight">
              {stationName} - Bekat qurilmalari
            </h3>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 mt-3">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 sm:py-1 rounded-xl sm:rounded-full transition-all text-center flex-1 sm:flex-none ${activeTab === tab.id ? 'bg-slate-800 text-white' : 'text-slate-500 bg-white/50 hover:bg-white/80 border border-slate-200/50'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 mt-0.5">
            {/* QR Chop etish faqat Aloqa dispetcherida ko'rinadi */}
            {isDispatcher && (
              <button
                onClick={openPrintingView}
                disabled={!equipments}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                <Printer size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">QR Chop etish</span>
              </button>
            )}
            <button onClick={onClose} className="rounded-xl bg-white border border-slate-200 p-2 sm:p-3 text-slate-400 hover:text-slate-900 transition-all duration-200 shadow-sm">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 custom-scrollbar">
          {(!swrData && isLoading) ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <>
              {activeTab === 'equipments' && (
                <>
                  {/* DYNAMIC CATEGORIES */}
                  {categories.map((category) => (
                    <div key={category.id} className="premium-card flex flex-col p-4 sm:p-5 mb-3">
                      <div className="flex items-center gap-3 sm:gap-4 border-b border-slate-200/60 pb-3 mb-3">
                        <CategoryAvatar name={category.name} color={category.color} size="sm" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{category.name || 'Nomsiz toifa'}</h4>
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Jami: {(category.items || []).length} ta</p>
                        </div>
                        {(!isEditing && canEdit) ? (
                          <button onClick={() => { setIsEditing(true); addItem(category.id); }} className={`shrink-0 text-[10px] sm:text-xs font-bold ${colorStyle(category.color).btnText} px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl flex items-center gap-1`}>
                            <Plus size={14} className="sm:w-4 sm:h-4" /> Qo'shish
                          </button>
                        ) : isEditing ? (
                          <div className="flex shrink-0 items-center gap-2">
                            <button onClick={() => addItem(category.id)} className={`text-[10px] sm:text-xs font-bold ${colorStyle(category.color).btnText} px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl flex items-center gap-1`}>
                              <Plus size={14} className="sm:w-4 sm:h-4" /> Qo'shish
                            </button>
                            <button onClick={() => setDeleteConfirmCategoryId(category.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors" title="Toifani o'chirish">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {(category.items || []).length === 0 && !isEditing && <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Kiritilmagan</p>}

                      <div className={isEditing ? "flex flex-col gap-3" : "flex flex-wrap gap-2"}>
                        {(category.items || []).map((item) => (
                          isEditing ? (
                            <div key={item.id} className="relative group flex items-center gap-2">
                              <DebouncedInput
                                value={item.name}
                                onChange={(val) => updateItem(category.id, item.id, val)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                                placeholder="Nomi..."
                              />
                              <button onClick={() => removeItem(category.id, item.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </div>
                          ) : (
                            <div key={item.id} className={`flex items-center gap-2 bg-white/70 border border-white/60 ${colorStyle(category.color).hoverBorder} px-4 py-2 rounded-xl transition-all cursor-default shadow-sm`}>
                              <div className={`w-2 h-2 rounded-full ${colorStyle(category.color).dot}`}></div>
                              <span className="font-bold text-slate-700">{item.name}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* ADD NEW CATEGORY */}
                  {isEditing && (
                    <div className="flex flex-col p-4 sm:p-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 mb-3">
                      <h4 className="text-sm font-bold text-slate-600 mb-3">Yangi toifa qo'shish</h4>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 transition-all"
                          placeholder="Toifa nomi..."
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                        <button onClick={handleAddCategory} className="px-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all text-sm whitespace-nowrap flex items-center justify-center gap-2">
                          <Plus size={16} /> Toifa qo'shish
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Oxirgi o'zgartirish ma'lumoti */}
                  {!isEditing && equipments?.updatedAt && (
                    <div className="mt-8 flex items-center justify-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/50 border border-white px-4 py-2 rounded-xl">
                        Oxirgi bor o&apos;zgartirish kiritilgan: {new Date(equipments.updatedAt).toLocaleString('ru-RU')} - <span className="text-slate-600">{equipments.updatedByName}</span>
                      </p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'tasks' && (
                <div className="flex flex-col gap-4 h-full relative">
                  {!selectedPlanType && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[50vh]">
                      <button onClick={() => setSelectedPlanType('tort')} className="premium-card p-6 text-left group flex flex-col justify-center items-center text-center">
                        <div className="h-20 w-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Target size={40} />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">To'rt haftalik ish reja</h4>
                        <p className="text-sm text-slate-500 px-4">To'rt haftalik rejadagi ishlarga bekat uskunalarining QR kodini bog'lash.</p>
                      </button>

                      <button onClick={() => setSelectedPlanType('yillik')} className="premium-card p-6 text-left group flex flex-col justify-center items-center text-center">
                        <div className="h-20 w-20 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Target size={40} />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">Yillik ish reja</h4>
                        <p className="text-sm text-slate-500 px-4">Yillik rejadagi ishlarga bekat uskunalarining QR kodini bog'lash.</p>
                      </button>
                    </div>
                  )}

                  {selectedPlanType && selectedTaskNsh === null && (
                    <div className="flex flex-col gap-4" style={{ height: 'calc(85vh - 180px)' }}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">
                          {selectedPlanType === 'tort' ? 'To\'rt haftalik jadval' : 'Yillik jadval'} — vazifa tanlash
                        </h3>
                        <button onClick={() => { setSelectedPlanType(null); setSearchQuery(''); setSelectedBolim(null); }} className="rounded-xl border border-slate-200/60 bg-white p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="border-b border-slate-200/60 pb-3">
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Vazifa qidirish..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-white" />
                      </div>
                      {/* Bu ro'yxatda 100 tagacha element chiqishi mumkin — tezlik uchun shaffof/blur effektsiz, oddiy kartalar ishlatiladi */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                        {selectedBolim === null && !searchQuery ? (
                          <div className="grid grid-cols-1 gap-3">
                            {(selectedPlanType === 'tort' ? TORT_HAFTALIK_REJA : YILLIK_REJA).map((b, idx) => (
                              <button key={idx} onClick={() => setSelectedBolim(idx)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-5 text-left transition-colors hover:border-purple-300 hover:bg-purple-50/30 group">
                                <span className="font-bold text-slate-700 group-hover:text-purple-600 transition-colors uppercase tracking-tight text-sm">{b.bolim}</span>
                                <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 border border-slate-200/60">{b.ishlar.length} ta ish</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedBolim !== null && (
                              <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-3">
                                <button onClick={() => { setSelectedBolim(null); setSearchQuery(''); }} className="flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700">
                                  <ChevronLeft size={14} /> Ortga ro&apos;yxatga
                                </button>
                                <span className="text-xs font-bold text-purple-600 truncate max-w-[200px] text-right">
                                  {(selectedPlanType === 'tort' ? TORT_HAFTALIK_REJA : YILLIK_REJA)[selectedBolim].bolim}
                                </span>
                              </div>
                            )}
                            {(selectedBolim !== null
                              ? (selectedPlanType === 'tort' ? TORT_HAFTALIK_REJA_FLAT : YILLIK_REJA_FLAT).filter(t => t.bolim === (selectedPlanType === 'tort' ? TORT_HAFTALIK_REJA : YILLIK_REJA)[selectedBolim].bolim)
                              : (selectedPlanType === 'tort' ? TORT_HAFTALIK_REJA_FLAT : YILLIK_REJA_FLAT)
                            )
                              .filter(task =>
                                (task.ish || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (task.davriylik || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (task.bajaruvchi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (task.manba || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (task.raqam || '').toLowerCase().includes(searchQuery.toLowerCase())
                              )
                              .slice(0, 100)
                              .map((task, ti) => {
                                const taskKey = taskDisplayKey(task.manba, task.raqam);
                                const mapping = taskMappings.find(m => m.taskNsh === taskKey);
                                return (
                                  <button
                                    key={ti}
                                    onClick={() => setSelectedTaskNsh(taskKey)}
                                    className={`w-full rounded-xl border p-3 text-left transition-colors hover:border-purple-300 hover:bg-purple-50/30 group ${mapping ? 'border-purple-300 bg-purple-50/40' : 'border-slate-200/60 bg-white'
                                      }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <p className="text-[10px] text-purple-600"><span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400 mr-0.5" /> {task.bolim}</p>
                                        <p className="text-[10px] text-amber-600/70"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 mr-0.5" /> {task.manba} {task.raqam}</p>
                                        <p className="text-[10px] text-slate-400"><Clock size={10} className="inline mr-0.5" /> {task.davriylik}</p>
                                        <p className="text-[10px] text-slate-400"><span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 mr-0.5" /> {task.bajaruvchi}</p>
                                      </div>
                                      {mapping && mapping.equipmentType.length > 0 && (
                                        <div className="shrink-0 bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-purple-200">
                                          ✓ {mapping.equipmentType.length} ta toifa
                                        </div>
                                      )}
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap text-xs font-bold text-slate-700 group-hover:text-slate-900">{task.ish}</p>
                                    {task.jurnal && (
                                      <div className="mt-2 inline-block rounded-md bg-purple-50/80 px-2 py-1 text-[9px] uppercase tracking-widest text-purple-600 border border-purple-100/60">
                                        Jurnal: {task.jurnal}
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedPlanType && selectedTaskNsh !== null && (() => {
                    const taskDef = (selectedPlanType === 'tort' ? TORT_HAFTALIK_REJA_FLAT : YILLIK_REJA_FLAT).find(t => taskDisplayKey(t.manba, t.raqam) === selectedTaskNsh);
                    const currentMapping = taskMappings.find(m => m.taskNsh === selectedTaskNsh);

                    return (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setSelectedTaskNsh(null)} className="p-2 bg-white rounded-xl hover:bg-slate-50 border border-slate-200 shadow-sm">
                            <ArrowRightLeft size={18} className="text-slate-600" />
                          </button>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800">{selectedTaskNsh || taskDef?.ish}</p>
                            {selectedTaskNsh && <p className="text-xs text-slate-500 max-w-xl truncate">{taskDef?.ish}</p>}
                          </div>
                        </div>

                        <div className="premium-card p-5 sm:p-8">
                          <h4 className="font-black text-slate-800 text-lg">Qaysi qurilmalar bog'lanadi?</h4>
                          <p className="mt-1 mb-6 text-xs font-bold text-slate-400">Bir nechta toifani tanlash mumkin — har birini bosib yoqing/o'chiring.</p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {categories.map(category => {
                              const isActive = currentMapping?.equipmentType.includes(category.id) ?? false;
                              return (
                                <button
                                  key={category.id}
                                  disabled={!isEditingMappings}
                                  onClick={() => {
                                    setTaskMappings(prev => {
                                      const existing = prev.find(p => p.taskNsh === selectedTaskNsh);
                                      if (!existing) {
                                        return [...prev, { taskNsh: selectedTaskNsh, equipmentType: [category.id] }];
                                      }
                                      const newTypes = isActive
                                        ? existing.equipmentType.filter(id => id !== category.id)
                                        : [...existing.equipmentType, category.id];
                                      if (newTypes.length === 0) {
                                        return prev.filter(p => p.taskNsh !== selectedTaskNsh);
                                      }
                                      return prev.map(p => p.taskNsh === selectedTaskNsh ? { ...p, equipmentType: newTypes } : p);
                                    });
                                  }}
                                  className={`p-5 text-left border-2 rounded-2xl transition-all relative ${isActive ? `${colorStyle(category.color).activeBorder} shadow-md` : 'border-white/60 bg-white/70 hover:border-slate-300'} ${!isEditingMappings ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  {isActive && <div className={`absolute top-4 right-4 ${colorStyle(category.color).iconText} bg-white rounded-full p-1 shadow-sm`}><Target size={20} /></div>}
                                  <div className={`h-12 w-12 ${colorStyle(category.color).iconBg} rounded-xl flex items-center justify-center text-xl font-black mb-4`}>{(category.name || '?').charAt(0).toUpperCase()}</div>
                                  <h5 className="font-bold text-slate-800 text-sm">{category.name}</h5>
                                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Jami: {(category.items || []).length} TA</p>
                                </button>
                              );
                            })}
                          </div>

                          {!isEditingMappings && (
                            <div className="flex items-center gap-2 text-xs font-bold text-red-500 mt-6 bg-red-50 p-4 rounded-2xl border border-red-100">
                              <AlertTriangle size={18} />
                              O'zgartirish kiritish uchun quyidagi "O'zgartirish" tugmasini bosing!
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="flex flex-col gap-3">
                  {isScanHistoryLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                  ) : !selectedHistoryCategory ? (
                    // BOSQICH 1 — Toifalar
                    categories.length === 0 ? (
                      <EmptyHint icon={History} text="Hali toifa qo'shilmagan" />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories.map(category => (
                          <button
                            key={category.id}
                            onClick={() => setSelectedHistoryCategoryId(category.id)}
                            className="premium-card flex items-center gap-4 p-4 sm:p-5 text-left"
                          >
                            <CategoryAvatar name={category.name} color={category.color} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-slate-900 tracking-tight truncate">{category.name || 'Nomsiz toifa'}</h4>
                              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{scanCountByCategory.get(category.id) || 0} marta skaner qilingan</p>
                            </div>
                            <ChevronRight size={20} className="shrink-0 text-slate-300" />
                          </button>
                        ))}
                      </div>
                    )
                  ) : !selectedHistoryItem ? (
                    // BOSQICH 2 — Toifadagi uskunalar
                    <>
                      <BackHeader title={selectedHistoryCategory.name || 'Toifa'} onBack={backToHistoryCategories} />
                      {historyCategoryItems.length === 0 ? (
                        <EmptyHint icon={History} text="Bu toifada uskuna yo'q" />
                      ) : (
                        <div className="flex flex-col gap-3">
                          {historyCategoryItems.map(({ item, scanCount, lastScan }) => (
                            <button
                              key={item.id}
                              onClick={() => setSelectedHistoryItemId(item.id)}
                              className="premium-card flex items-center justify-between gap-3 p-4 text-left"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">{item.name}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  {scanCount > 0 ? `${scanCount} marta skaner qilingan` : 'Hali skaner qilinmagan'}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-3">
                                {lastScan && (
                                  <div className="text-right">
                                    <p className="text-xs font-bold text-slate-600">{lastScan.scanned_by}</p>
                                    <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400 font-medium">
                                      <Clock size={10} /> {formatScanDate(lastScan.scanned_at)}
                                    </p>
                                  </div>
                                )}
                                <ChevronRight size={18} className="text-slate-300" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    // BOSQICH 3 — Tanlangan uskunaning to'liq skaner tarixi
                    <>
                      <BackHeader title={selectedHistoryItem.name || 'Uskuna'} onBack={backToHistoryItems} />
                      {selectedHistoryItemScans.length === 0 ? (
                        <EmptyHint icon={History} text="Bu uskuna hali skaner qilinmagan" />
                      ) : (
                        <div className="flex flex-col gap-3">
                          {selectedHistoryItemScans.map((scan: TaskScan) => (
                            <div key={scan.id} className="premium-card flex items-center justify-between gap-3 p-4">
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest truncate">{scan.task_nsh}</p>
                                <p className="mt-1 text-xs font-bold text-slate-600">{scan.scanned_by}</p>
                              </div>
                              <p className="shrink-0 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                <Clock size={10} /> {formatScanDate(scan.scanned_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions — "Uskunalar ro'yxati va QR" va "QR kodni bog'lash" bo'limlarida (ikkalasi ham Katta elektromexanikka tegishli), yoki tahrirlash davom etayotganda ko'rinadi */}
        {(isEditing || isEditingMappings || activeTab === 'equipments' || (activeTab === 'tasks' && canEditTaskMappings)) && (
          <div className="border-t border-white/60 px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            {isEditing || isEditingMappings ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setIsEditingMappings(false);
                    if (swrData) {
                      setCategories(swrData.categories || []);
                      setTaskMappings(normalizeTaskMappings(swrData.taskMappings));
                    }
                  }}
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition whitespace-nowrap"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:flex-1 sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition shadow-md shadow-emerald-500/20 whitespace-nowrap"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Saqlash
                </button>
              </>
            ) : activeTab === 'equipments' ? (
              canEdit ? (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={!swrData}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition shadow-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit3 size={18} /> O&apos;zgartirish
                </button>
              ) : (
                <div className="text-[11px] sm:text-xs font-bold text-slate-400 text-center sm:text-left">Tahrirlash huquqi faqat Katta elektromexanikda</div>
              )
            ) : (
              <button
                onClick={() => setIsEditingMappings(true)}
                disabled={!swrData}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition shadow-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit3 size={18} /> O&apos;zgartirish
              </button>
            )}
          </div>
        )}

      </div>

      {/* Toifani o'chirishni tasdiqlash */}
      {deleteConfirmCategoryId && (() => {
        const categoryToDelete = categories.find(c => c.id === deleteConfirmCategoryId);
        return (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
            <div className="premium-card w-full max-w-md p-8 animate-scale-in">
              <h3 className="text-lg font-black text-slate-900">Toifani o&apos;chirish</h3>
              <p className="mt-2 text-sm text-slate-500">
                <span className="font-bold text-slate-700">{categoryToDelete?.name || 'Bu toifa'}</span> toifasi va undagi barcha uskunalar ({(categoryToDelete?.items || []).length} ta) o&apos;chiriladi. Bu amalni Bekor qilish tugmasi bilangina qaytarish mumkin — hozircha faqat lokal, "Saqlash" bosilgandan keyin bazaga yoziladi.
              </p>
              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setDeleteConfirmCategoryId(null)} className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Bekor qilish</button>
                <button onClick={() => removeCategory(deleteConfirmCategoryId)} className="rounded-xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors">O&apos;chirish</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Katta miqdorda o'chirilishi tasdiqlanmasa — saqlanmaydi */}
      {saveWarning && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="premium-card w-full max-w-md p-8 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600"><AlertTriangle size={20} /></div>
              <h3 className="text-lg font-black text-slate-900">Diqqat — ko&apos;p narsa o&apos;chiriladi</h3>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-500">
              {isMassDeletion(saveWarning.prevItems, saveWarning.nextItems) && (
                <p>
                  Uskunalar: <span className="font-bold text-slate-700">{saveWarning.prevItems} ta</span> → <span className="font-black text-red-600">{saveWarning.nextItems} ta</span>
                </p>
              )}
              {isMassDeletion(saveWarning.prevMappings, saveWarning.nextMappings) && (
                <p>
                  QR bog&apos;lanishlar: <span className="font-bold text-slate-700">{saveWarning.prevMappings} ta</span> → <span className="font-black text-red-600">{saveWarning.nextMappings} ta</span>
                </p>
              )}
              <p>Bu chindan xohlagan o&apos;zgarishingizmi, yoki ma&apos;lumot hali to&apos;liq yuklanmagan bo&apos;lishi mumkinmi? Xato bo&apos;lsa, "Bekor qilish"ni bosib sahifani yangilang.</p>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setSaveWarning(null)} className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Bekor qilish</button>
              <button
                onClick={() => { setSaveWarning(null); performSave(); }}
                className="rounded-xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
              >
                Ha, shunday saqlayman
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
