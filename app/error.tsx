'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('🔴 Ilovada xato yuz berdi:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="rounded-3xl border border-red-100 bg-white/80 p-8 shadow-xl backdrop-blur-xl text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-black text-slate-900">
            Kutilmagan xato yuz berdi
          </h2>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            Sahifa yuklanishida xatolik bor. Qayta urinib ko&apos;ring yoki bosh sahifaga qayting.
          </p>

          {/* Error detail (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs font-bold text-slate-400 uppercase tracking-widest">
                Tafsilotlar
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-red-300 font-mono">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={reset}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl active:scale-95"
            >
              <RotateCcw size={16} />
              Qayta urinish
            </button>
            <a
              href="/"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100 active:scale-95"
            >
              <Home size={16} />
              Bosh sahifa
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
