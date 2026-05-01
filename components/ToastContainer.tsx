'use client'

import { Toast } from '@/lib/hooks/useToast'
import { CheckCircle2, X, AlertTriangle, Info } from 'lucide-react'

const iconMap = {
  success: <CheckCircle2 size={18} />,
  error: <AlertTriangle size={18} />,
  info: <Info size={18} />,
}

const colorMap = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-purple-200 bg-purple-50 text-purple-700',
}

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-xl backdrop-blur-sm animate-slide-in-right ${colorMap[t.type]}`}
        >
          {iconMap[t.type]}
          <span className="text-sm font-bold max-w-xs">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 rounded-lg p-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
