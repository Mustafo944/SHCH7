const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/journals/DU46JournalView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace modal state
content = content.replace(
  `const [emConfirmModal, setEmConfirmModal] = useState<number | null>(null)`,
  `const [approvalChainModal, setApprovalChainModal] = useState<{ index: number, isEdit: boolean, currentChain: string[] } | null>(null)`
);

// 2. Add Dynamic Approval Helpers
const isConfirmerRegex = /\/\*\* Joriy foydalanuvchi tasdiqlash \(confirmer\) rolimi\? \*\/\s*const isConfirmer[\s\S]*?const isEMConfirmer[\s\S]*?return getCreator\(e\) === 'yul_ustasi' && isElektromexanik\n  \}/;

const newHelpers = `// ── Yangi Dinamik Tasdiqlash Mantiqi ──
  const getNextApproverRole = (e: DU46Entry, col: 3 | 12): string | null => {
    const isBoshlandi = col === 3 ? e.kamchilikBajarildi : e.bartarafBajarildi;
    if (!isBoshlandi) return null;
    
    const chain = e.approvalChain || [];
    const approvals = col === 3 ? (e.approvalsCol3 || []) : (e.approvalsCol12 || []);
    
    if (approvals.length < chain.length) {
      return chain[approvals.length];
    }
    
    const creator = getCreator(e);
    if (creator === 'bekat_boshlighi') {
      return null; // DSP yoki BB yaratgan bo'lsa zanjir tugaganda hammasi tugaydi
    }
    
    const isApprovedByDSP = col === 3 ? e.kamchilikBBTasdiqladi : e.bartarafBBTasdiqladi;
    if (!isApprovedByDSP) return 'DSP';
    
    return null;
  }

  const canIApprove = (e: DU46Entry, col: 3 | 12): boolean => {
    const nextRole = getNextApproverRole(e, col);
    if (!nextRole) return false;
    if (nextRole === 'DSP') return isBB;
    return userRole === nextRole;
  }`;

content = content.replace(isConfirmerRegex, newHelpers);

// 3. Replace Handlers Column 3
const handlersCol3Regex = /const handleKamchilikBoshlandiClick = \(i: number\) => \{[\s\S]*?const handleKamchilikTasdiqlash = async \(i: number\) => \{[\s\S]*?catch \{ \/\* \*\/ \}\n  \}/;

const newHandlersCol3 = `const handleKamchilikBoshlandiClick = (i: number) => {
    setApprovalChainModal({ index: i, isEdit: false, currentChain: [] })
  }

  const handleSaveApprovalChain = async (idx: number, chain: string[]) => {
    const prev = [...entries]
    const updated = [...entries]
    const e = updated[idx]
    
    if (approvalChainModal?.isEdit) {
      updated[idx] = { ...e, approvalChain: chain }
    } else {
      updated[idx] = {
        ...e,
        kamchilikBajarildi: true,
        kamchilikBajarildiAt: new Date().toISOString(),
        kamchilikImzo: userName,
        approvalChain: chain,
        approvalsCol3: [],
        approvalsCol12: []
      }
    }
    
    try {
      await saveEntries(updated, prev)
      setApprovalChainModal(null)
      showMsg(approvalChainModal?.isEdit ? 'Tasdiqlash zanjiri yangilandi!' : 'Boshlandi belgilandi!')
      if (!approvalChainModal?.isEdit) onAccepted?.()
    } catch { /* */ }
  }

  const handleKamchilikTasdiqlash = async (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    const e = updated[i]
    const nextRole = getNextApproverRole(e, 3)
    
    if (nextRole === 'DSP') {
      updated[i] = {
        ...e,
        kamchilikBBTasdiqladi: true,
        kamchilikBBTasdiqladiAt: new Date().toISOString(),
        kamchilikBBImzo: userName,
      }
    } else if (nextRole) {
      const newApprovals = [...(e.approvalsCol3 || [])]
      newApprovals.push({ role: nextRole, signedBy: userName, signedAt: new Date().toISOString() })
      updated[i] = { ...e, approvalsCol3: newApprovals }
    }
    
    try {
      await saveEntries(updated, prev)
      showMsg('Tasdiqlandi!')
    } catch { /* */ }
  }`;

content = content.replace(handlersCol3Regex, newHandlersCol3);

// 4. Replace Handlers Column 12
const handlersCol12Regex = /const handleBartarafBajarildiClick = \(i: number\) => \{[\s\S]*?const handleBartarafTasdiqlash = async \(i: number\) => \{[\s\S]*?catch \{ \/\* \*\/ \}\n  \}/;

const newHandlersCol12 = `const handleBartarafBajarildiClick = (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    updated[i] = {
      ...updated[i],
      bartarafBajarildi: true,
      bartarafBajarildiAt: new Date().toISOString(),
      bartarafImzo: userName,
    }
    saveEntries(updated, prev).then(() => {
      showMsg('Bajarildi belgilandi!')
      onAccepted?.()
    }).catch(() => {})
  }

  const handleBartarafTasdiqlash = async (i: number) => {
    const prev = [...entries]
    const updated = [...entries]
    const e = updated[i]
    const nextRole = getNextApproverRole(e, 12)
    
    if (nextRole === 'DSP') {
      updated[i] = {
        ...e,
        bartarafBBTasdiqladi: true,
        bartarafBBTasdiqladiAt: new Date().toISOString(),
        bartarafBBImzo: userName,
      }
    } else if (nextRole) {
      const newApprovals = [...(e.approvalsCol12 || [])]
      newApprovals.push({ role: nextRole, signedBy: userName, signedAt: new Date().toISOString() })
      updated[i] = { ...e, approvalsCol12: newApprovals }
    }
    
    try {
      await saveEntries(updated, prev)
      showMsg('Tasdiqlandi!')
    } catch { /* */ }
  }`;

content = content.replace(handlersCol12Regex, newHandlersCol12);

// 5. Replace UI Column 3 Buttons
const col3UIRegex = /\{\/\* — Boshlandi \/ EM Tasdiqlash \/ BB Tasdiqlash tugmalari \*\/\}\s*<div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1\.5">[\s\S]*?<\/div>\s*<\/td>/;

const newCol3UI = `{/* — Boshlandi / EM Tasdiqlash / BB Tasdiqlash tugmalari */}
                      <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1.5">
                        {e.kamchilik && iAmCreator && !e.kamchilikBajarildi && !isMonthInPast(journalMonth) && (
                          <button
                            onClick={() => handleKamchilikBoshlandiClick(i)}
                            disabled={!e.oyKun1 || !e.soatMinut1}
                            className={\`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 \${(!e.oyKun1 || !e.soatMinut1) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'btn-gradient'}\`}
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
                            {iAmCreator && !isMonthInPast(journalMonth) && (
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
                            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-600 border border-blue-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{appr.signedBy}</span>
                            </div>
                          </div>
                        ))}

                        {e.kamchilikBBTasdiqladi && (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bekat navbatchisi:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 border border-amber-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.kamchilikBBImzo}</span>
                            </div>
                          </div>
                        )}

                        {canIApprove(e, 3) && !isMonthInPast(journalMonth) && (
                          <button
                            onClick={() => handleKamchilikTasdiqlash(i)}
                            className="w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 bg-amber-500 text-white hover:bg-amber-600 border-transparent mt-1"
                          >
                            Tasdiqlash
                          </button>
                        )}
                      </div>
                    </td>`;

content = content.replace(col3UIRegex, newCol3UI);

// 6. Replace UI Column 12 Buttons
const col12UIRegex = /\{\/\* — Bajarildi \/ EM Tasdiqlash \/ BB Tasdiqlash tugmalari \*\/\}\s*<div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1\.5">[\s\S]*?<\/div>\s*<\/td>/;

const newCol12UI = `{/* — Bajarildi / EM Tasdiqlash / BB Tasdiqlash tugmalari */}
                      <div className="absolute bottom-2 left-0 right-0 px-2 flex flex-col items-center gap-1.5">
                        {e.bartarafInfo && iAmCreator && !e.bartarafBajarildi && !isMonthInPast(journalMonth) && (
                          <button
                            onClick={() => handleBartarafBajarildiClick(i)}
                            disabled={!e.oyKun4 || !e.soatMinut4 || !e.kamchilikBajarildi}
                            className={\`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 \${(!e.oyKun4 || !e.soatMinut4 || !e.kamchilikBajarildi) ? 'bg-slate-100/50 text-slate-300 border-slate-200 cursor-not-allowed' : 'btn-gradient'}\`}
                          >
                            Bajarildi
                          </button>
                        )}

                        {e.bartarafBajarildi && (
                          <div className="flex flex-col items-center gap-1 w-full relative">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bajardi:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.bartarafImzo}</span>
                            </div>
                          </div>
                        )}

                        {e.approvalsCol12?.map((appr, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{appr.role.replace('_', ' ')}:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-600 border border-blue-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{appr.signedBy}</span>
                            </div>
                          </div>
                        ))}

                        {e.bartarafBBTasdiqladi && (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bekat navbatchisi:</span>
                            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 border border-amber-100 w-full justify-center shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> <span className="truncate">{e.bartarafBBImzo}</span>
                            </div>
                          </div>
                        )}

                        {canIApprove(e, 12) && !isMonthInPast(journalMonth) && (
                          <button
                            onClick={() => handleBartarafTasdiqlash(i)}
                            className="w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 bg-amber-500 text-white hover:bg-amber-600 border-transparent mt-1"
                          >
                            Tasdiqlash
                          </button>
                        )}
                        {/* 3-ustun tasdiqlanmagan ogohlantirish */}
                        {e.bartarafInfo && !e.kamchilikBBTasdiqladi && (
                          <span className="text-[8px] font-black text-red-400 text-center leading-tight px-1 mt-1 uppercase tracking-tighter">
                            3-ustun oxirigacha tasdiqlanmagan
                          </span>
                        )}
                      </div>
                    </td>`;

content = content.replace(col12UIRegex, newCol12UI);

// 7. Remove automatic time renders (e.kamchilikBBVaqt and e.bartarafBBVaqt)
const autoTimeCol3Regex = /\{e\.kamchilikBBTasdiqladi && e\.kamchilikBBVaqt \? \([\s\S]*?\) : null\}/g;
content = content.replace(autoTimeCol3Regex, '{null}');

const autoTimeCol12Regex = /\{e\.bartarafBBTasdiqladi && e\.bartarafBBVaqt \? \([\s\S]*?\) : null\}/g;
content = content.replace(autoTimeCol12Regex, '{null}');

// 8. Replace Modal Component at the bottom
const modalRegex = /\{\/\* ═══ Elektromexanik tasdiqlaydimi\? Modal \(Yo'l ustasi — faqat 3-ustun\) ═══ \*\/\}[\s\S]*?<\/div>\s*\)\s*\}/;

const newModal = \`{/* ═══ Tasdiqlash Zanjiri Modali ═══ */}
      {approvalChainModal !== null && (() => {
        const AVAILABLE_ROLES = [
          { id: 'katta_elektromexanik', label: 'Katta elektromexanik' },
          { id: 'elektromexanik', label: 'Elektromexanik' },
          { id: 'bekat_boshlighi', label: 'Bekat boshlig\\'i' },
          { id: 'yul_ustasi', label: 'Yo\\'l ustasi' },
        ];
        // Cannot use React hooks inside this arrow function easily if we just write it like this,
        // so we'll use a small trick: Since the modal is simple, we'll map currentChain directly.
        // Actually, it's better to render a subcomponent or just use a state array.
        // Wait, since we are inside a functional component body, we can just declare the state at the top.
        // But we didn't declare a state for the selected roles in the modal.
        // Let's create an inline component here!
        return (
          <ApprovalChainModalComponent 
            initialChain={approvalChainModal.currentChain}
            availableRoles={AVAILABLE_ROLES}
            isEdit={approvalChainModal.isEdit}
            onCancel={() => setApprovalChainModal(null)}
            onSave={(chain) => handleSaveApprovalChain(approvalChainModal.index, chain)}
          />
        )
      })()}
    </div>
  )
}

function ApprovalChainModalComponent({ initialChain, availableRoles, isEdit, onCancel, onSave }: any) {
  const [chain, setChain] = useState<string[]>(initialChain || []);

  const toggleRole = (roleId: string) => {
    if (chain.includes(roleId)) {
      setChain(chain.filter(r => r !== roleId));
    } else {
      setChain([...chain, roleId]);
    }
  }

  // Yana bitta state: reordering
  // Sodda qilish uchun faqat bosilish ketma-ketligi saqlanadi. (chain.push)

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
          {availableRoles.map(r => {
            const idx = chain.indexOf(r.id);
            const isSelected = idx !== -1;
            return (
              <button
                key={r.id}
                onClick={() => toggleRole(r.id)}
                className={\`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95 \${isSelected ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}\`}
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
}\`;

content = content.replace(modalRegex, newModal);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Refactoring complete");
