import React, { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Trash2 } from 'lucide-react'
import type { ReportEntry } from '@/types'

/* ═══════════════════════════════════════════════════════════════════════
   LocalTextarea / LocalInput — debounced input komponentlari
   ═══════════════════════════════════════════════════════════════════════ */

export const LocalTextarea = ({ value, onChange, readOnly, className, rows, spellCheck, lang }: any) => {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])

  useEffect(() => {
    if (val !== value) {
      const timer = setTimeout(() => onChange(val), 500)
      return () => clearTimeout(timer)
    }
  }, [val, value, onChange])

  return (
    <textarea
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== value) onChange(val) }}
      readOnly={readOnly}
      className={className}
      rows={rows}
      spellCheck={spellCheck}
      lang={lang}
    />
  )
}

export const LocalInput = ({ value, onChange, readOnly, className, placeholder }: any) => {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])

  useEffect(() => {
    if (val !== value) {
      const timer = setTimeout(() => onChange(val), 500)
      return () => clearTimeout(timer)
    }
  }, [val, value, onChange])

  return (
    <input
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== value) onChange(val) }}
      readOnly={readOnly}
      className={className}
      placeholder={placeholder}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MemoizedJournalRow — jadval qatori (React.memo bilan optimallashtirish)
   ═══════════════════════════════════════════════════════════════════════ */

const MemoizedJournalRow = React.memo(({
  e,
  i,
  isConfirmed,
  canEditPlan,
  updateEntry,
  openSelectModal,
  openNavbatdanTashqariModal,
  handleDeleteNavbatdanTashqari,
  handleBajarishClick,
  submitting
}: {
  e: ReportEntry;
  i: number;
  isConfirmed: boolean;
  canEditPlan: boolean;
  updateEntry: (index: number, field: keyof ReportEntry, value: string) => void;
  openSelectModal: (index: number, type: '4-haftalik' | 'yillik') => void;
  openNavbatdanTashqariModal: (index: number) => void;
  handleDeleteNavbatdanTashqari: (index: number) => void;
  handleBajarishClick: (index: number) => void;
  submitting: boolean;
}) => {
  const tasksCount = [!!e.haftalikJadval, !!e.yillikJadval, !!e.yangiIshlar, !!e.kmoBartaraf, !!e.majburiyOzgarish].filter(Boolean).length;
  const doneCount = [e.doneHaftalik, e.doneYillik, e.doneYangi, e.doneKmo, e.doneMajburiy].filter(Boolean).length;
  const isPartiallyDone = doneCount > 0 && doneCount < tasksCount;

  const isInProgressRow = (!!e.haftalikJadval && !e.doneHaftalik && e.inProgressHaftalik) ||
    (!!e.yillikJadval && !e.doneYillik && e.inProgressYillik) ||
    (!!e.yangiIshlar && !e.doneYangi && e.inProgressYangi) ||
    (!!e.kmoBartaraf && !e.doneKmo && e.inProgressKmo) ||
    (!!e.majburiyOzgarish && !e.doneMajburiy && e.inProgressMajburiy);

  const showJarayonda = isInProgressRow || isPartiallyDone;
  const needsAction = tasksCount > 0 && doneCount < tasksCount;

  return (
    <tr className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="border-r border-slate-100 p-1 align-top text-center relative">
        <LocalInput
          value={e.ragat}
          readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
          onChange={(val: string) => updateEntry(i, 'ragat', val)}
          className={`w-full rounded bg-transparent text-center font-bold text-purple-600 outline-none focus:bg-white ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-40' : ''}`}
        />
        {e.isNavbatdanTashqari && (
          <div className="absolute top-1 left-1">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-amber-100 text-[8px] font-black text-amber-600 border border-amber-200 shadow-sm" title="Navbatdan tashqari">⚡</span>
          </div>
        )}
      </td>
      <td className="relative border-r border-slate-100 p-1 align-top">
        <div className="relative">
          <LocalTextarea
            value={e.haftalikJadval}
            readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
            onChange={(val: string) => updateEntry(i, 'haftalikJadval', val)}
            className={`min-h-[60px] w-full resize-none rounded border bg-slate-50 px-2 py-1.5 text-[11px] outline-none focus:border-purple-500/50 shadow-inner ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-60 cursor-not-allowed border-transparent' : 'border-slate-100'}`}
          />
          {e.doneHaftalik && (
            <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm ${e.completedAfterMissedDateHaftalik ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Bajarildi">
              <CheckCircle2 size={12} />
            </div>
          )}
          {!e.doneHaftalik && !!e.haftalikJadval && e.inProgressHaftalik && (
            <div className="absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm bg-orange-400" title="Kutilmoqda">
              <Clock size={12} />
            </div>
          )}
        </div>
        {(!e.adImzosi && !isConfirmed && canEditPlan) && (
          <button
            type="button"
            onClick={() => openSelectModal(i, '4-haftalik')}
            className="absolute bottom-2 right-2 rounded bg-purple-100 p-1 text-purple-600 shadow-sm transition hover:bg-purple-600 hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}
      </td>
      <td className="relative border-r border-slate-100 p-1 align-top">
        <div className="relative">
          <LocalTextarea
            value={e.yillikJadval}
            readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
            onChange={(val: string) => updateEntry(i, 'yillikJadval', val)}
            className={`min-h-[60px] w-full resize-none rounded border bg-slate-50 px-2 py-1.5 text-[11px] outline-none focus:border-purple-500/50 shadow-inner ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-60 cursor-not-allowed border-transparent' : 'border-slate-100'}`}
          />
          {e.doneYillik && (
            <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm ${e.completedAfterMissedDateYillik ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Bajarildi">
              <CheckCircle2 size={12} />
            </div>
          )}
          {!e.doneYillik && !!e.yillikJadval && e.inProgressYillik && (
            <div className="absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm bg-orange-400" title="Kutilmoqda">
              <Clock size={12} />
            </div>
          )}
        </div>
        {(!e.adImzosi && !isConfirmed && canEditPlan) && (
          <button
            type="button"
            onClick={() => openSelectModal(i, 'yillik')}
            className="absolute bottom-2 right-2 rounded bg-purple-100 p-1 text-purple-600 shadow-sm transition hover:bg-purple-600 hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}
      </td>
      <td className="relative border-r border-slate-100 p-1 align-top">
        <div className="relative h-full">
          {e.isNavbatdanTashqari && (
            <div className="mb-1 flex items-center justify-center gap-1">
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-600 border border-amber-200 shadow-sm whitespace-nowrap">⚡ Navbatdan tashqari</span>
            </div>
          )}
          <LocalTextarea
            value={e.yangiIshlar}
            readOnly={!!e.adImzosi || (!e.isNavbatdanTashqari && isConfirmed) || (!e.isNavbatdanTashqari && !canEditPlan) || (e.isNavbatdanTashqari && e.doneYangi)}
            onChange={(val: string) => updateEntry(i, 'yangiIshlar', val)}
            className={`min-h-[60px] w-full h-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-purple-500/50 ${(!!e.adImzosi || (!e.isNavbatdanTashqari && isConfirmed) || (!e.isNavbatdanTashqari && !canEditPlan) || (e.isNavbatdanTashqari && e.doneYangi)) ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {e.doneYangi && (
            <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm ${e.completedAfterMissedDateYangi ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Bajarildi">
              <CheckCircle2 size={12} />
            </div>
          )}
          {!e.doneYangi && !!e.yangiIshlar && e.inProgressYangi && (
            <div className="absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm bg-orange-400" title="Kutilmoqda">
              <Clock size={12} />
            </div>
          )}
          {(e.isNavbatdanTashqari && !e.doneYangi) && (
            <>
              <button
                type="button"
                onClick={() => openNavbatdanTashqariModal(i)}
                className="absolute bottom-2 right-2 rounded bg-amber-100 p-1 text-amber-600 shadow-sm transition hover:bg-amber-600 hover:text-white"
                title="Qayta tanlash"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              {(!e.yangiIshlar || !e.yangiIshlar.trim()) && (
                <button
                  type="button"
                  onClick={() => handleDeleteNavbatdanTashqari(i)}
                  className="absolute bottom-2 right-8 rounded bg-red-100 p-1 text-red-600 shadow-sm transition hover:bg-red-600 hover:text-white"
                  title="Qatorni o'chirish"
                >
                  <Trash2 size={12} strokeWidth={2.5} />
                </button>
              )}
            </>
          )}
        </div>
      </td>
      <td className="relative border-r border-slate-100 p-1 align-top">
        <div className="relative h-full">
          <LocalTextarea
            value={e.kmoBartaraf}
            readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
            onChange={(val: string) => updateEntry(i, 'kmoBartaraf', val)}
            className={`min-h-[60px] w-full h-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-purple-500/50 ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {e.doneKmo && (
            <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm ${e.completedAfterMissedDateKmo ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Bajarildi">
              <CheckCircle2 size={12} />
            </div>
          )}
          {!e.doneKmo && !!e.kmoBartaraf && e.inProgressKmo && (
            <div className="absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm bg-orange-400" title="Kutilmoqda">
              <Clock size={12} />
            </div>
          )}
        </div>
      </td>
      <td className="relative border-r border-slate-100 p-1 align-top">
        <div className="relative h-full">
          <LocalTextarea
            value={e.majburiyOzgarish}
            readOnly={!!e.adImzosi || isConfirmed || !canEditPlan}
            onChange={(val: string) => updateEntry(i, 'majburiyOzgarish', val)}
            className={`min-h-[60px] w-full h-full resize-none rounded border border-transparent bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-purple-500/50 ${(!!e.adImzosi || isConfirmed || !canEditPlan) ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {e.doneMajburiy && (
            <div className={`absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm ${e.completedAfterMissedDateMajburiy ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Bajarildi">
              <CheckCircle2 size={12} />
            </div>
          )}
          {!e.doneMajburiy && !!e.majburiyOzgarish && e.inProgressMajburiy && (
            <div className="absolute top-1 right-1 text-white rounded-full p-0.5 shadow-sm bg-orange-400" title="Kutilmoqda">
              <Clock size={12} />
            </div>
          )}
        </div>
      </td>
      <td className="border-r border-slate-100 p-2 text-center align-middle font-medium text-purple-600">
        {e.bajarildiShn}
      </td>
      <td className="border-r border-slate-100 p-2 text-center align-middle italic text-slate-400">
        {e.bajarildiImzo}
      </td>
      <td className="p-2 text-center align-middle">
        {(() => {
          const isLate = !!(e.completedAfterMissedDateHaftalik || e.completedAfterMissedDateYillik || e.completedAfterMissedDateYangi || e.completedAfterMissedDateKmo || e.completedAfterMissedDateMajburiy)
          const lateDateStr = e.completedAfterMissedDateHaftalik || e.completedAfterMissedDateYillik || e.completedAfterMissedDateYangi || e.completedAfterMissedDateKmo || e.completedAfterMissedDateMajburiy
          let formattedLateDate = ''
          if (lateDateStr) {
            const d = new Date(lateDateStr)
            formattedLateDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
          }

          const allTasksDone = tasksCount > 0 && doneCount === tasksCount;
          const effectiveAdImzosi = e.adImzosi || (allTasksDone ? (e.bajarildiImzo || e.bajarildiShn) : '');

          const adNode = effectiveAdImzosi ? (
            <div className="flex flex-col items-center gap-1">
              <span className={`inline-flex items-center gap-1 whitespace-pre-wrap rounded-md px-2 py-1 text-[10px] font-bold border ${isLate ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                <CheckCircle2 size={12} /> {effectiveAdImzosi}
              </span>
              {isLate && formattedLateDate && (
                <span className="text-[9px] font-bold text-orange-500">{formattedLateDate} da bajarildi</span>
              )}
            </div>
          ) : null;

          if (isConfirmed) {
            if (needsAction) {
              if (showJarayonda) {
                return (
                  <button
                    onClick={() => handleBajarishClick(i)}
                    disabled={submitting}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-black text-white shadow-sm hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50 animate-pulse"
                  >
                    Jarayonda
                  </button>
                )
              }

              return (
                <button
                  onClick={() => handleBajarishClick(i)}
                  disabled={submitting}
                  className="rounded-lg bg-purple-500 px-3 py-1.5 text-[10px] font-black text-white shadow-sm hover:bg-purple-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  Bajarish
                </button>
              )
            }

            if (effectiveAdImzosi) return adNode;
            return <span className="text-[10px] text-slate-300 italic">Kutilmoqda...</span>;
          }

          if (effectiveAdImzosi) return adNode;
          return <span className="text-[10px] text-slate-300 italic">Kutilmoqda...</span>
        })()}
      </td>
    </tr>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.e === nextProps.e &&
    prevProps.isConfirmed === nextProps.isConfirmed &&
    prevProps.canEditPlan === nextProps.canEditPlan &&
    prevProps.submitting === nextProps.submitting
  )
})
MemoizedJournalRow.displayName = 'MemoizedJournalRow'

export { MemoizedJournalRow }
