import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Plus, Trash2, Printer, AlertTriangle, Loader2, ArrowRightLeft, Target, ChevronLeft, Clock } from 'lucide-react';
import { StationEquipments, EquipmentCategory } from '@/types';
import { getStationEquipments, upsertStationEquipments } from '@/lib/supabase-db';
import { useToast } from '@/lib/hooks/useToast';
import useSWR from 'swr';
import { QRCodeSVG } from 'qrcode.react';
import { TORT_HAFTALIK_REJA_FLAT, YILLIK_REJA_FLAT, TORT_HAFTALIK_REJA, YILLIK_REJA, taskDisplayKey } from '@/lib/reja-data';
import { TaskQRMapping } from '@/types';
import { buildEquipmentQrValue } from '@/lib/utils/qr';

const COLOR_STYLES: Record<string, any> = {
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
  canEdit: boolean; // Katta elektromexanik bo'lsa true
  userName: string;
  onClose: () => void;
}

export function StationEquipmentsModal({ stationId, stationName, canEdit, userName, onClose }: Props) {
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
  const [isPrinting, setIsPrinting] = useState(false);

  const [equipments, setEquipments] = useState<StationEquipments | null>(null);

  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [taskMappings, setTaskMappings] = useState<TaskQRMapping[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [activeTab, setActiveTab] = useState<'equipments' | 'tasks'>('equipments');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPlanType, setSelectedPlanType] = useState<'tort' | 'yillik' | null>(null);
  const [selectedTaskNsh, setSelectedTaskNsh] = useState<string | null>(null);
  const [selectedBolim, setSelectedBolim] = useState<number | null>(null);

  // Modal ochiq turganda orqadagi sahifa scroll bo'lib, ikkalasi bir vaqtda tortilib friz bo'lib ko'rinishining oldini oladi
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  useEffect(() => {
    if (swrData && !isEditing) {
      setEquipments(swrData);
      setCategories(swrData.categories || []);
      setTaskMappings(swrData.taskMappings || []);
    }
  }, [swrData, isEditing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Filtrlash: faqat bo'sh bo'lmagan qatorlar
      const cleanCategories = categories.map(c => ({
        ...c,
        items: c.items.filter(item => item.name.trim() !== '')
      }));

      const data = await upsertStationEquipments(stationId, cleanCategories, taskMappings, userName);
      if (data) {
        toast.success("O'zgarishlar muvaffaqiyatli saqlandi!");
        setIsEditing(false);
        mutate(data); // Keshni yangilaymiz
      }
    } catch (err: any) {
      toast.error(err.message || 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (categoryId: string) => {
    setCategories(prev => prev.map(c => 
      c.id === categoryId ? { ...c, items: [...c.items, { id: `item_${Date.now()}_${Math.floor(Math.random()*1000)}`, name: '' }] } : c
    ));
  };

  const updateItem = (categoryId: string, itemId: string, name: string) => {
    setCategories(prev => prev.map(c => 
      c.id === categoryId ? { ...c, items: c.items.map(item => item.id === itemId ? { ...item, name } : item) } : c
    ));
  };

  const removeItem = (categoryId: string, itemId: string) => {
    setCategories(prev => prev.map(c => 
      c.id === categoryId ? { ...c, items: c.items.filter(item => item.id !== itemId) } : c
    ));
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const colors = ['blue', 'emerald', 'orange', 'purple', 'rose', 'cyan', 'indigo', 'teal', 'pink'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newCat: EquipmentCategory = {
      id: `cat_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      name: newCategoryName,
      color: randomColor,
      items: []
    };
    setCategories([...categories, newCat]);
    setNewCategoryName('');
  };

  // Chop etish sahifasi
  if (isPrinting) {
    return (
      <div className="fixed inset-0 z-[10000] bg-white overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <h2 className="text-xl font-bold text-slate-800">{stationName} - QR Kodlarni chop etish</h2>
          <div className="flex gap-4">
            <button onClick={() => setIsPrinting(false)} className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-100">Orqaga</button>
            <button onClick={() => window.print()} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2">
              <Printer size={18} /> Chop etish
            </button>
          </div>
        </div>

        {/* PRINT CONTENT */}
        <div className="p-8 max-w-5xl mx-auto print:p-8 print:max-w-full">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-6 print:grid-cols-3 print:gap-16">
            {categories.map(category => (
              category.items.map(item => (
                <div key={item.id} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-2xl page-break-inside-avoid print:border-4">
                  <QRCodeSVG value={buildEquipmentQrValue(stationId, item.id)} size={160} />
                  <span className="mt-4 font-black text-sm text-center">{stationName}</span>
                  <span className="font-black text-xl text-center mt-1">{item.name}</span>
                  <span className="text-xs font-bold text-slate-500 mt-2 uppercase text-center">{category.name}</span>
                </div>
              ))
            ))}
          </div>
        </div>
        
        {/* CSS for print */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            .print\\:hidden { display: none !important; }
            .fixed { position: static !important; }
            .fixed > div:last-child, .fixed > div:last-child * { visibility: visible; }
            .fixed > div:last-child { position: absolute; left: 0; top: 0; width: 100%; }
            .page-break-inside-avoid { page-break-inside: avoid; }
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-2 sm:p-4 backdrop-blur-[2px]">
      <div className="flex h-[95vh] sm:h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl sm:rounded-[32px] p-0 bg-white/95 border border-slate-200/60 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between border-b border-slate-200/60 px-4 py-4 sm:px-8 sm:py-6 bg-white gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 break-words leading-tight">
              {stationName} - Bekat qurilmalari
            </h3>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 mt-3">
              <button 
                onClick={() => setActiveTab('equipments')}
                className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 sm:py-1 rounded-xl sm:rounded-full transition-all text-center flex-1 sm:flex-none ${activeTab === 'equipments' ? 'bg-slate-800 text-white' : 'text-slate-500 bg-white/50 hover:bg-slate-100 border border-slate-200/50'}`}
              >
                Uskunalar ro'yxati va QR
              </button>
              <button 
                onClick={() => { setActiveTab('tasks'); setSelectedPlanType(null); setSelectedTaskNsh(null); }}
                className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 sm:py-1 rounded-xl sm:rounded-full transition-all text-center flex-1 sm:flex-none ${activeTab === 'tasks' ? 'bg-slate-800 text-white' : 'text-slate-500 bg-white/50 hover:bg-slate-100 border border-slate-200/50'}`}
              >
                QR kodni bog'lash
              </button>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-xl bg-white border border-slate-200 p-2 sm:p-3 text-slate-400 hover:text-slate-900 transition-all duration-200 shadow-sm mt-0.5">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 custom-scrollbar bg-transparent">
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
                    <div key={category.id} className="flex flex-col p-4 sm:p-5 rounded-2xl transition-all duration-200 hover:shadow-md border border-slate-200/60 bg-white hover:bg-slate-50 mb-3">
                      <div className="flex items-center gap-3 sm:gap-4 border-b border-slate-100 pb-3 mb-3">
                        <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br ${COLOR_STYLES[category.color]?.gradient || COLOR_STYLES.blue.gradient} text-lg sm:text-xl font-black text-white shadow-md`}>
                          {category.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{category.name}</h4>
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Jami: {category.items.length} ta</p>
                        </div>
                        {(!isEditing && canEdit) ? (
                          <button onClick={() => { setIsEditing(true); addItem(category.id); }} className={`shrink-0 text-[10px] sm:text-xs font-bold ${COLOR_STYLES[category.color]?.btnText || COLOR_STYLES.blue.btnText} px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl flex items-center gap-1`}>
                            <Plus size={14} className="sm:w-4 sm:h-4" /> Qo'shish
                          </button>
                        ) : isEditing ? (
                          <button onClick={() => addItem(category.id)} className={`shrink-0 text-[10px] sm:text-xs font-bold ${COLOR_STYLES[category.color]?.btnText || COLOR_STYLES.blue.btnText} px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl flex items-center gap-1`}>
                            <Plus size={14} className="sm:w-4 sm:h-4" /> Qo'shish
                          </button>
                        ) : null}
                      </div>
                      
                      {category.items.length === 0 && !isEditing && <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Kiritilmagan</p>}
                      
                      <div className={isEditing ? "flex flex-col gap-3" : "flex flex-wrap gap-2"}>
                        {category.items.map((item) => (
                          isEditing ? (
                            <div key={item.id} className="relative group flex items-center gap-2">
                              <DebouncedInput
                                value={item.name}
                                onChange={(val) => updateItem(category.id, item.id, val)}
                                className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all`}
                                placeholder="Nomi..."
                              />
                              <button onClick={() => removeItem(category.id, item.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </div>
                          ) : (
                            <div key={item.id} className={`flex flex-col bg-white border border-slate-200 ${COLOR_STYLES[category.color]?.hoverBorder || COLOR_STYLES.blue.hoverBorder} px-4 py-2 rounded-xl transition-all cursor-default shadow-sm`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${COLOR_STYLES[category.color]?.dot || COLOR_STYLES.blue.dot}`}></div>
                                <span className="font-bold text-slate-700">{item.name}</span>
                              </div>
                              {item.lastScannedAt ? (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                  <Clock size={10} /> {new Date(item.lastScannedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {item.lastScannedBy && ` — ${item.lastScannedBy}`}
                                </div>
                              ) : (
                                <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-400 font-medium uppercase tracking-widest">
                                  <Clock size={9} /> Hali tekshirilmagan
                                </div>
                              )}
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
              {!isEditing && equipments?.updatedAt && activeTab === 'equipments' && (
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
                      <button onClick={() => setSelectedPlanType('tort')} className="bg-white border border-slate-200/60 p-6 rounded-3xl hover:bg-slate-50 hover:shadow-lg transition-all text-left group flex flex-col justify-center items-center text-center">
                        <div className="h-20 w-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Target size={40} />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">To'rt haftalik ish reja</h4>
                        <p className="text-sm text-slate-500 px-4">To'rt haftalik rejadagi ishlarga bekat uskunalarining QR kodini bog'lash.</p>
                      </button>
                      
                      <button onClick={() => setSelectedPlanType('yillik')} className="bg-white border border-slate-200/60 p-6 rounded-3xl hover:bg-slate-50 hover:shadow-lg transition-all text-left group flex flex-col justify-center items-center text-center">
                        <div className="h-20 w-20 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Target size={40} />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">Yillik ish reja</h4>
                        <p className="text-sm text-slate-500 px-4">Yillik rejadagi ishlarga bekat uskunalarining QR kodini bog'lash.</p>
                      </button>
                    </div>
                  )}

                  {selectedPlanType && !selectedTaskNsh && (
                    <div className="flex flex-col gap-4" style={{height: 'calc(85vh - 180px)'}}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">
                          {selectedPlanType === 'tort' ? 'To\'rt haftalik jadval' : 'Yillik jadval'} — vazifa tanlash
                        </h3>
                        <button onClick={() => { setSelectedPlanType(null); setSearchQuery(''); setSelectedBolim(null); }} className="rounded-xl border border-slate-200/60 bg-white p-2 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="border-b border-slate-100 pb-3">
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Vazifa qidirish..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-white" />
                      </div>
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
                                    className={`w-full rounded-xl border p-3 text-left transition-colors hover:border-purple-300 hover:bg-purple-50/30 group ${
                                      mapping ? 'border-purple-300 bg-purple-50/40' : 'border-slate-200/60 bg-white'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <p className="text-[10px] text-purple-600"><span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400 mr-0.5" /> {task.bolim}</p>
                                        <p className="text-[10px] text-amber-600/70"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 mr-0.5" /> {task.manba} {task.raqam}</p>
                                        <p className="text-[10px] text-slate-400"><Clock size={10} className="inline mr-0.5" /> {task.davriylik}</p>
                                        <p className="text-[10px] text-slate-400"><span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 mr-0.5" /> {task.bajaruvchi}</p>
                                      </div>
                                      {mapping && (
                                        <div className="shrink-0 bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-purple-200">
                                          ✓ {mapping.equipmentType}
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

                  {selectedPlanType && selectedTaskNsh && (() => {
                    const taskDef = (selectedPlanType === 'tort' ? TORT_HAFTALIK_REJA_FLAT : YILLIK_REJA_FLAT).find(t => taskDisplayKey(t.manba, t.raqam) === selectedTaskNsh);
                    const currentMapping = taskMappings.find(m => m.taskNsh === selectedTaskNsh);
                    
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setSelectedTaskNsh(null)} className="p-2 bg-white rounded-xl hover:bg-slate-50 border border-slate-200 shadow-sm">
                            <ArrowRightLeft size={18} className="text-slate-600" />
                          </button>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800">{selectedTaskNsh}</p>
                            <p className="text-xs text-slate-500 max-w-xl truncate">{taskDef?.ish}</p>
                          </div>
                        </div>

                        <div className="bg-white/70 border border-white/60 p-5 sm:p-8 rounded-3xl">
                          <h4 className="font-black text-slate-800 mb-6 text-lg">Qaysi qurilmalar bog'lanadi?</h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {categories.map(category => (
                              <button 
                                key={category.id}
                                disabled={!isEditing}
                                onClick={() => {
                                  if (currentMapping?.equipmentType === category.id) {
                                    setTaskMappings(prev => prev.filter(p => p.taskNsh !== selectedTaskNsh));
                                  } else {
                                    setTaskMappings(prev => [...prev.filter(p => p.taskNsh !== selectedTaskNsh), { taskNsh: selectedTaskNsh, equipmentType: category.id }]);
                                  }
                                }}
                                className={`p-5 text-left border-2 rounded-2xl transition-all relative ${currentMapping?.equipmentType === category.id ? `${COLOR_STYLES[category.color]?.activeBorder || COLOR_STYLES.blue.activeBorder} shadow-md` : 'border-slate-200 bg-white hover:border-slate-300'} ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                              >
                                {currentMapping?.equipmentType === category.id && <div className={`absolute top-4 right-4 ${COLOR_STYLES[category.color]?.iconText || COLOR_STYLES.blue.iconText} bg-white rounded-full p-1 shadow-sm`}><Target size={20} /></div>}
                                <div className={`h-12 w-12 ${COLOR_STYLES[category.color]?.iconBg || COLOR_STYLES.blue.iconBg} rounded-xl flex items-center justify-center text-xl font-black mb-4`}>{category.name.charAt(0).toUpperCase()}</div>
                                <h5 className="font-bold text-slate-800 text-sm">{category.name}</h5>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Jami: {category.items.length} TA</p>
                              </button>
                            ))}
                          </div>

                          {!isEditing && (
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
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {!isEditing ? (
            <>
              {canEdit ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition shadow-md whitespace-nowrap"
                >
                  <Edit3 size={18} /> O&apos;zgartirish
                </button>
              ) : (
                <div className="text-[11px] sm:text-xs font-bold text-slate-400 text-center sm:text-left">Tahrirlash huquqi faqat Katta elektromexanikda</div>
              )}
              
              <button
                onClick={() => setIsPrinting(true)}
                disabled={!equipments}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Printer size={18} /> QR Chop etish
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (swrData) {
                    setCategories(swrData.categories || []);
                    setTaskMappings(swrData.taskMappings || []);
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
          )}
        </div>

      </div>
    </div>
  );
}
