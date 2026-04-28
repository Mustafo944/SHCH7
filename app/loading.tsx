/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 text-slate-900">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.06),_transparent_40%)]" />
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-200/20 blur-[100px] animate-pulse" />

      {/* Loading content */}
      <div className="relative z-10 flex flex-col items-center animate-fade-up">
        {/* Logo / Spinner container */}
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-white p-4 shadow-xl shadow-blue-500/10 ring-1 ring-slate-200/60 backdrop-blur-md">
          <Loader2 className="absolute h-full w-full p-2 text-blue-500 animate-[spin_3s_linear_infinite]" strokeWidth={1} />
          <img src="/uty-logo.png" alt="UTY" className="h-12 w-12 object-contain animate-pulse" />
        </div>
        
        {/* Text */}
        <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">
          Smart SHCH
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-500 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
          Ma&apos;lumotlar yuklanmoqda...
        </p>

        {/* Skeleton lines representing layout below text (Optional, adds context) */}
        <div className="mt-12 flex w-full max-w-sm flex-col gap-3 opacity-60">
          <div className="h-12 w-full animate-pulse rounded-2xl bg-white/60 shadow-sm" />
          <div className="h-12 w-full animate-pulse rounded-2xl bg-white/60 shadow-sm" style={{ animationDelay: '150ms' }} />
          <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-white/60 shadow-sm mx-auto" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
