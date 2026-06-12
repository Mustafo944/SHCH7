'use client'

import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineNotifier() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine)
    }

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-fade-up">
      <div className="flex items-center gap-3 rounded-2xl bg-rose-500/90 px-4 py-3 text-white shadow-[0_8px_30px_rgba(244,63,94,0.4)] backdrop-blur-md border border-rose-400">
        <WifiOff size={20} className="animate-pulse" />
        <span className="text-sm font-bold tracking-wide">Internet aloqasi yo'q! Oflayn rejim</span>
      </div>
    </div>
  )
}
