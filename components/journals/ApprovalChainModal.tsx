import React, { useState } from 'react'

export interface ApprovalChainModalProps {
  initialChain: string[]
  isEdit: boolean
  creatorRole: string
  onCancel: () => void
  onSave: (chain: string[]) => void
}

const AVAILABLE_ROLES = [
  { id: 'katta_elektromexanik', label: 'Katta elektromexanik' },
  { id: 'elektromexanik', label: 'Elektromexanik' },
  { id: 'worker', label: 'Elektromontyor' },
  { id: 'bekat_boshlighi', label: 'Bekat boshlig\'i' },
  { id: 'yul_ustasi', label: 'Yo\'l ustasi' },
  { id: 'ech_xodimi', label: 'ECH xodimi' },
]

export function ApprovalChainModal({ initialChain, isEdit, creatorRole, onCancel, onSave }: ApprovalChainModalProps) {
  const [chain, setChain] = useState<string[]>(initialChain || [])

  const toggleRole = (roleId: string) => {
    if (chain.includes(roleId)) {
      setChain(chain.filter(r => r !== roleId))
    } else {
      setChain([...chain, roleId])
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-md animate-fade-up">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl border border-slate-100 animate-scale-in">
        <h3 className="text-center text-lg font-black text-slate-900 mb-2">
          {isEdit ? 'Tasdiqlash zanjirini tahrirlash' : 'Kimlar tasdiqlashi kerak?'}
        </h3>
        <p className="text-center text-[11px] text-slate-500 mb-6 px-4">
          Qaysi xodimlar qatnashishini <b>ketma-ketlikda</b> tanlang. (Bekat navbatchisi avtomatik oxirida tasdiqlaydi)
        </p>
        
        <div className="space-y-2 mb-6">
          {AVAILABLE_ROLES.map(r => {
            const idx = chain.indexOf(r.id)
            const isSelected = idx !== -1

            // Bug #10 fix: bir turdagi rollar bir-birini chiqarib tashlaydi
            // (elektromexanik, katta_elektromexanik va worker bitta guruh)
            const WORKER_GROUP = ['worker', 'elektromexanik', 'katta_elektromexanik']
            const isCreatorInWorkerGroup = WORKER_GROUP.includes(creatorRole)
            const isRoleInWorkerGroup = WORKER_GROUP.includes(r.id)

            let isDisabled = false
            if (creatorRole === r.id) isDisabled = true // O'zining roli
            // Xodim guruhidagi rol creator bo'lsa, boshqa xodim guruh rollarini o'chiramiz
            if (isCreatorInWorkerGroup && isRoleInWorkerGroup && creatorRole !== r.id) isDisabled = true

            return (
              <button
                key={r.id}
                onClick={() => !isDisabled && toggleRole(r.id)}
                disabled={isDisabled}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isDisabled 
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                    : isSelected 
                      ? 'bg-purple-50 border-purple-200 text-purple-700 active:scale-95' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95'
                }`}
              >
                <span className="font-bold text-sm">{r.label}</span>
                {isSelected && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-[11px] font-black">
                    {idx + 1}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-black text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
          >
            Bekor qilish
          </button>
          <button
            onClick={() => onSave(chain)}
            className="flex-1 rounded-xl bg-purple-500 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-500/20 hover:bg-purple-600 transition-all active:scale-95"
          >
            {isEdit ? 'Saqlash' : 'Boshlash'}
          </button>
        </div>
      </div>
    </div>
  )
}
