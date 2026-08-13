import React from 'react'
import { CheckCircle2, Plus, BookOpen } from 'lucide-react'
import type { DU46Entry } from '@/types'
import { DateInput, TimeInput } from './JournalSelectModal'
import { LocalTextarea, LocalInput } from '@/components/worker/WorkerComponents'
import { MicButton } from './MicButton'
import { getCreator } from '@/lib/journals/du46Approval'
import { isFutureDate, isMonthInPast } from './helpers'

interface DU46JournalRowProps {
  e: DU46Entry
  i: number
  viewMode: 'kunlik' | 'jadval'
  selectedDateFilter: number
  userName: string
  userRole: string
  journalMonth: string
  isDispatcher: boolean
  isCurrentMonth: boolean
  DU46_WORKER_GROUP_ROLES: string[]
  isBekatNavbatchisi: boolean
  isCreator: (e: DU46Entry) => boolean
  isCol3Finished: (e: DU46Entry) => boolean
  isCol12Finished: (e: DU46Entry) => boolean
  canIApprove: (e: DU46Entry, col: 3 | 12) => boolean
  isFinalApprover: (e: DU46Entry, col: 3 | 12) => boolean
  getWaitingForRole: (e: DU46Entry, col: 3 | 12) => string | null
  update: (i: number, field: keyof DU46Entry, val: string) => void
  setTaskModalIdx: (i: number) => void
  handleKamchilikBoshlandiClick: (i: number) => void
  setApprovalChainModal: (val: { index: number, isEdit: boolean, currentChain: string[] }) => void
  handleKamchilikTasdiqlash: (i: number) => void
  handleBartarafBajarildiClick: (i: number) => void
  handleBartarafTasdiqlash: (i: number) => void
}

export const DU46JournalRow = React.memo(({
  e, i, viewMode, selectedDateFilter, userName, userRole, journalMonth,
  isDispatcher, isCurrentMonth, DU46_WORKER_GROUP_ROLES, isBekatNavbatchisi,
  isCreator, isCol3Finished, isCol12Finished, canIApprove, isFinalApprover, getWaitingForRole,
  update, setTaskModalIdx, handleKamchilikBoshlandiClick, setApprovalChainModal,
  handleKamchilikTasdiqlash, handleBartarafBajarildiClick, handleBartarafTasdiqlash
}: DU46JournalRowProps) => {

  if (viewMode === 'kunlik') {
    const isSessionActive = (e as any)._isNew || (e as any)._isEdited
    if (!isSessionActive) {
      const selDayStr = String(selectedDateFilter).padStart(2, '0')
      const val = (e.oyKun1 || '').trim()
      const valDay = val.split('-')[0].split('.')[0]
      if (valDay !== selDayStr) return null
    }
  }

  const iAmRoleCreator = isCreator(e)
  const isExactCreator = e.kamchilikImzo ? e.kamchilikImzo === userName : iAmRoleCreator
  const isCrossWorkerGroupFix = DU46_WORKER_GROUP_ROLES.includes(getCreator(e)) && DU46_WORKER_GROUP_ROLES.includes(userRole)
  const hasRightToFix = isExactCreator || isCrossWorkerGroupFix || (e.approvalChain && e.approvalChain.includes(userRole))

  const hasNoCreator = !e.createdByRole && !e.kamchilik && !e.soatMinut1
  const canWriteCol3 = isCurrentMonth && !e.kamchilikBajarildi && !isDispatcher

  const canWriteCol12 = isCurrentMonth && !e.bartarafBajarildi && isCol3Finished(e) && !isDispatcher && hasRightToFix && !isBekatNavbatchisi
  const canWriteMiddle = isCurrentMonth && !isDispatcher && !isCol12Finished(e) && (hasRightToFix || hasNoCreator)

  return (
    <tr className="border-b border-slate-200 hover:bg-blue-50/50 transition-colors">
      <td className="border-r border-slate-200 p-1 text-center bg-slate-50/30">
        <LocalInput
          value={e.nomber || ''}
          onChange={(val: string) => update(i, 'nomber', val)}
          readOnly={isDispatcher || !!e.yuborildi}
          placeholder={String(i + 1)}
          className="w-full rounded bg-transparent text-center font-black text-slate-400 outline-none focus:bg-white transition-all focus:text-purple-600"
        />
      </td>

      <td className="border-r border-slate-200 p-0.5">
        <DateInput
          value={e.oyKun1 || ''}
          onChange={(val: string) => update(i, 'oyKun1', val)}
          readOnly={true}
        />
      </td>

      <td className="border-r border-slate-200 p-0.5 align-top relative bg-purple-50/10">
        <div className="pb-[150px]">
          <TimeInput
            value={e.soatMinut1 || ''}
            onChange={(val: string) => update(i, 'soatMinut1', val)}
            readOnly={!canWriteCol3}
            className={e.kamchilikBajarildi ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-transparent focus:bg-white focus:shadow-inner'}
          />
        </div>
        {e.kamchilik && e.kamchilikBajarildi && (
          <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center justify-end">
            {isCol3Finished(e) && e.kamchilikBBVaqt ? (
              <div className="w-full rounded-xl bg-amber-100 px-2 py-2 text-center text-[10px] font-black text-amber-700 border border-amber-200 shadow-sm">
                {e.kamchilikBBVaqt}
              </div>
            ) : null}
          </div>
        )}
      </td>

      <td className="border-r border-slate-200 p-0.5 align-top relative min-w-[200px]">
        <div className="pb-[150px]">
          {isDispatcher ? (
            <div className="w-full rounded px-3 py-2 text-[11px] font-medium text-slate-700 bg-white min-h-[60px]">
              {e.kamchilik || <span className="text-slate-300">—</span>}
            </div>
          ) : (
            <div>
              {e.linkedReportId && (
                <div className="mb-1 flex items-center gap-1 w-max rounded bg-purple-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-500 border border-purple-100">
                  <BookOpen size={10} /> Oylik ish reja
                </div>
              )}
              <LocalTextarea
                value={e.kamchilik || ''}
                onChange={(val: string) => update(i, 'kamchilik', val)}
                readOnly={!canWriteCol3 || !e.oyKun1 || !e.soatMinut1}
                rows={3}
                spellCheck={false}
                lang="uz"
                placeholder={(!e.oyKun1 || !e.soatMinut1) && canWriteCol3 ? "Oldin 1 va 2-ustunlarni to'ldiring" : ""}
                className="w-full resize-y rounded bg-transparent px-3 py-2 text-[11px] font-medium text-slate-700 outline-none transition-all focus:bg-white focus:shadow-inner"
              />
              {canWriteCol3 && e.oyKun1 && e.soatMinut1 && (
                <div className="mt-1 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setTaskModalIdx(i)}
                    title="Standart vazifalar ro'yxatidan tanlash"
                    className="flex items-center justify-center rounded-lg bg-purple-50 p-1.5 text-purple-600 shadow-sm border border-purple-100 transition-all hover:bg-purple-600 hover:text-white"
                  >
                    <Plus size={12} strokeWidth={3} />
                  </button>
                  <MicButton
                    baseText={e.kamchilik || ''}
                    onChange={(val: string) => update(i, 'kamchilik', val)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1.5">
          {e.kamchilik?.trim() && iAmRoleCreator && !e.kamchilikBajarildi && !isMonthInPast(journalMonth) && (
            <button
              onClick={() => handleKamchilikBoshlandiClick(i)}
              disabled={!e.oyKun1 || !e.soatMinut1}
              className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${(!e.oyKun1 || !e.soatMinut1) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'btn-gradient'}`}
            >
              ▶ Boshlandi
            </button>
          )}

          {e.kamchilikBajarildi && (
            <div className="flex flex-col items-center gap-1 w-full relative group/edit">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Boshladi:</span>
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 w-full justify-center shadow-sm relative">
                <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.kamchilikImzo}</span>
              </div>
              {isExactCreator && !isMonthInPast(journalMonth) && !isCol3Finished(e) && (
                <button
                  onClick={() => setApprovalChainModal({ index: i, isEdit: true, currentChain: e.approvalChain || [] })}
                  className="absolute top-0 right-0 p-1 bg-white/80 rounded shadow-sm text-slate-400 hover:text-purple-600 border border-slate-200"
                  title="Tasdiqlash zanjirini tahrirlash"
                >
                  ✏️
                </button>
              )}
            </div>
          )}

          {e.approvalsCol3?.map((appr, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 w-full">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{appr.role.replace('_', ' ')}:</span>
              <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-600 border border-blue-100 w-full justify-center shadow-sm">
                <CheckCircle2 size={12} strokeWidth={3} />
                <span className="truncate">{appr.signedBy}</span>
              </div>
            </div>
          ))}

          {e.kamchilikBBTasdiqladi && (
            <div className="flex flex-col items-center gap-1 w-full">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bekat navbatchisi:</span>
              <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 border border-amber-100 w-full justify-center shadow-sm">
                <CheckCircle2 size={12} strokeWidth={3} />
                <span className="truncate">{e.kamchilikBBImzo}</span>
              </div>
            </div>
          )}

          {canIApprove(e, 3) && !isMonthInPast(journalMonth) ? (() => {
            const isFinal = isFinalApprover(e, 3)
            const canConfirm = !isFinal || !!e.kamchilikBBVaqt
            return (
              <div className="flex flex-col gap-1 w-full mt-1">
                {isFinal && (
                  <TimeInput
                    value={e.kamchilikBBVaqt || ''}
                    onChange={(val: string) => update(i, 'kamchilikBBVaqt', val)}
                    readOnly={false}
                    className="w-full bg-white shadow-sm border border-slate-200"
                  />
                )}
                <button
                  onClick={() => handleKamchilikTasdiqlash(i)}
                  disabled={!canConfirm}
                  className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${!canConfirm ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 border-transparent'}`}
                >
                  Tasdiqlash
                </button>
              </div>
            )
          })() : (
            (() => {
              const waitingFor = getWaitingForRole(e, 3)
              if (!isMonthInPast(journalMonth) && waitingFor) {
                return (
                  <div className="w-full rounded-xl bg-orange-50 px-2 py-1.5 border border-orange-100 mt-1 flex flex-col items-center">
                    <span className="text-[8px] font-bold uppercase text-orange-400">Navbat kutilmoqda</span>
                    <span className="text-[9px] font-black text-orange-600 text-center leading-tight">Avval {waitingFor} tasdiqlashi kerak</span>
                  </div>
                )
              }
              return null
            })()
          )}
        </div>
      </td>

      {(['oyKun2', 'soatMinut2', 'xabarUsuli', 'oyKun3', 'soatMinut3', 'dspImzo'] as (keyof DU46Entry)[]).map((field, fi) => (
        <td key={fi} className="border-r border-slate-200 p-0.5 bg-purple-50/5">
          {(field === 'oyKun2' || field === 'oyKun3') ? (
            <DateInput
              value={(e[field] as string) || ''}
              onChange={(val: string) => update(i, field, val)}
              readOnly={!canWriteMiddle}
            />
          ) : (field === 'soatMinut2' || field === 'soatMinut3') ? (
            <TimeInput
              value={(e[field] as string) || ''}
              onChange={(val: string) => update(i, field, val)}
              readOnly={!canWriteMiddle}
              className="bg-transparent focus:bg-white focus:shadow-inner"
            />
          ) : (
            <LocalInput
              value={(e[field] as string) || ''}
              onChange={(val: string) => update(i, field, val)}
              readOnly={!canWriteMiddle}
              className="w-full rounded bg-transparent px-1.5 py-3 text-center text-[11px] outline-none transition-all focus:bg-white focus:shadow-inner"
            />
          )}
        </td>
      ))}

      <td className="border-r border-slate-200 p-0.5">
        <DateInput
          value={e.oyKun4 || ''}
          onChange={(val: string) => update(i, 'oyKun4', val)}
          readOnly={!canWriteCol12}
        />
      </td>

      <td className="border-r border-slate-200 p-0.5 align-top relative bg-amber-50/5">
        <div className="pb-[150px]">
          <TimeInput
            value={e.soatMinut4 || ''}
            onChange={(val: string) => update(i, 'soatMinut4', val)}
            readOnly={!canWriteCol12}
            className={e.bartarafBajarildi ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-transparent focus:bg-white focus:shadow-inner'}
          />
        </div>
        {e.bartarafInfo && e.bartarafBajarildi && (
          <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center justify-end">
            {isCol12Finished(e) && e.bartarafBBVaqt ? (
              <div className="w-full rounded-xl bg-amber-100 px-2 py-2 text-center text-[10px] font-black text-amber-700 border border-amber-200 shadow-sm">
                {e.bartarafBBVaqt}
              </div>
            ) : null}
          </div>
        )}
      </td>

      <td className="p-0.5 align-top relative bg-amber-50/5 min-w-[200px]">
        <div className="pb-[150px]">
          {isDispatcher ? (
            <div className="w-full rounded px-3 py-2 text-[11px] font-medium text-slate-700 bg-white min-h-[60px]">
              {e.bartarafInfo || <span className="text-slate-300">—</span>}
            </div>
          ) : (
            <>
              <LocalTextarea
                value={e.bartarafInfo || ''}
                onChange={(val: string) => update(i, 'bartarafInfo', val)}
                readOnly={!canWriteCol12}
                rows={3}
                spellCheck={false}
                lang="uz"
                className={`w-full resize-y rounded px-3 py-2 text-[11px] font-medium outline-none transition-all ${!canWriteCol12 && !e.bartarafInfo
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : canWriteCol12
                      ? 'bg-transparent focus:bg-white focus:shadow-inner text-slate-700'
                      : 'bg-transparent text-slate-700 cursor-not-allowed'
                  }`}
                placeholder={!isCol3Finished(e) ? '3-ustun tasdiqlanishi kerak...' : ''}
              />
              {canWriteCol12 && (
                <div className="mt-1 flex items-center justify-end">
                  <MicButton
                    baseText={e.bartarafInfo || ''}
                    onChange={(val: string) => update(i, 'bartarafInfo', val)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1.5">
          {e.bartarafInfo?.trim() && hasRightToFix && !isBekatNavbatchisi && !e.bartarafBajarildi && !isMonthInPast(journalMonth) && (
            <button
              onClick={() => handleBartarafBajarildiClick(i)}
              disabled={!e.oyKun4 || !e.soatMinut4 || !e.kamchilikBajarildi || isFutureDate(e.oyKun4)}
              title={isFutureDate(e.oyKun4) ? "Kelajakdagi sana uchun tugatish mumkin emas" : "Tugadi"}
              className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${(!e.oyKun4 || !e.soatMinut4 || !e.kamchilikBajarildi || isFutureDate(e.oyKun4)) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'btn-gradient'}`}
            >
              Tugadi
            </button>
          )}

          {e.bartarafBajarildi && (
            <div className="flex flex-col items-center gap-1 w-full relative">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tugadi:</span>
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 w-full justify-center shadow-sm">
                <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.bartarafImzo}</span>
              </div>
            </div>
          )}

          {e.approvalsCol12?.map((app, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 w-full mt-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{app.role.replace('_', ' ')}:</span>
              <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 border border-blue-100 w-full justify-center shadow-sm">
                <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{app.signedBy}</span>
              </div>
            </div>
          ))}

          {e.bartarafBBTasdiqladi && (
            <div className="flex flex-col items-center gap-1 w-full">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bekat navbatchisi:</span>
              <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 border border-amber-100 w-full justify-center shadow-sm">
                <CheckCircle2 size={12} strokeWidth={3} />
                <span className="truncate">{e.bartarafBBImzo}</span>
              </div>
            </div>
          )}

          {canIApprove(e, 12) && !isMonthInPast(journalMonth) ? (() => {
            const isFinal = isFinalApprover(e, 12)
            const canConfirm = !isFinal || !!e.bartarafBBVaqt
            return (
              <div className="flex flex-col gap-1 w-full mt-1">
                {isFinal && (
                  <TimeInput
                    value={e.bartarafBBVaqt || ''}
                    onChange={(val: string) => update(i, 'bartarafBBVaqt', val)}
                    readOnly={false}
                    className="w-full bg-white shadow-sm border border-slate-200"
                  />
                )}
                <button
                  onClick={() => handleBartarafTasdiqlash(i)}
                  disabled={!canConfirm}
                  className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${!canConfirm ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 border-transparent'}`}
                >
                  Tasdiqlash
                </button>
              </div>
            )
          })() : (
            (() => {
              const waitingFor = getWaitingForRole(e, 12)
              if (!isMonthInPast(journalMonth) && waitingFor) {
                return (
                  <div className="w-full rounded-xl bg-orange-50 px-2 py-1.5 border border-orange-100 mt-1 flex flex-col items-center">
                    <span className="text-[8px] font-bold uppercase text-orange-400">Navbat kutilmoqda</span>
                    <span className="text-[9px] font-black text-orange-600 text-center leading-tight">Avval {waitingFor} tasdiqlashi kerak</span>
                  </div>
                )
              }
              return null
            })()
          )}
        </div>
      </td>
    </tr>
  )
}, (prev, next) => {
  // Tez yo'l: agar reference bir xil bo'lsa, qator o'zgarmagan
  if (
    prev.e === next.e &&
    prev.i === next.i &&
    prev.viewMode === next.viewMode &&
    prev.selectedDateFilter === next.selectedDateFilter &&
    prev.isDispatcher === next.isDispatcher &&
    prev.isCurrentMonth === next.isCurrentMonth
  ) return true

  // Reference farq qilsa ham, lekin boshqa proplar va data maydonlari o'zgarmagan
  // bo'lsa, qayta render KERAK EMAS — lipirlash shundan kelib chiqadi.
  if (
    prev.i !== next.i ||
    prev.viewMode !== next.viewMode ||
    prev.selectedDateFilter !== next.selectedDateFilter ||
    prev.isDispatcher !== next.isDispatcher ||
    prev.isCurrentMonth !== next.isCurrentMonth
  ) return false

  // Entry object'larni maydon bo'yicha solishtirish (referencial emas)
  const a = prev.e
  const b = next.e
  return (
    a._id === b._id &&
    a.nomber === b.nomber &&
    a.oyKun1 === b.oyKun1 &&
    a.soatMinut1 === b.soatMinut1 &&
    a.kamchilik === b.kamchilik &&
    a.oyKun2 === b.oyKun2 &&
    a.soatMinut2 === b.soatMinut2 &&
    a.xabarUsuli === b.xabarUsuli &&
    a.oyKun3 === b.oyKun3 &&
    a.soatMinut3 === b.soatMinut3 &&
    a.dspImzo === b.dspImzo &&
    a.oyKun4 === b.oyKun4 &&
    a.soatMinut4 === b.soatMinut4 &&
    a.bartarafInfo === b.bartarafInfo &&
    a.kamchilikBajarildi === b.kamchilikBajarildi &&
    a.kamchilikImzo === b.kamchilikImzo &&
    a.kamchilikBBTasdiqladi === b.kamchilikBBTasdiqladi &&
    a.kamchilikBBImzo === b.kamchilikBBImzo &&
    a.kamchilikBBVaqt === b.kamchilikBBVaqt &&
    a.bartarafBajarildi === b.bartarafBajarildi &&
    a.bartarafImzo === b.bartarafImzo &&
    a.bartarafBBTasdiqladi === b.bartarafBBTasdiqladi &&
    a.bartarafBBImzo === b.bartarafBBImzo &&
    a.bartarafBBVaqt === b.bartarafBBVaqt &&
    a.createdByRole === b.createdByRole &&
    a.bartarafByRole === b.bartarafByRole &&
    a.approvalChain === b.approvalChain &&
    a.approvalsCol3 === b.approvalsCol3 &&
    a.approvalsCol12 === b.approvalsCol12 &&
    (a as any)._isNew === (b as any)._isNew &&
    (a as any)._isEdited === (b as any)._isEdited
  )
})

DU46JournalRow.displayName = 'DU46JournalRow'
