'use client'

import { useState, useCallback, useRef } from 'react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

let toastCounter = 0

export function useToast(autoDismissMs = 4000) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback(
    (type: Toast['type'], message: string) => {
      const id = `toast_${++toastCounter}`
      setToasts(prev => [...prev.slice(-4), { id, type, message }])

      const timer = setTimeout(() => {
        dismiss(id)
      }, autoDismissMs)

      timersRef.current.set(id, timer)
      return id
    },
    [autoDismissMs, dismiss]
  )

  const success = useCallback((msg: string) => show('success', msg), [show])
  const error = useCallback((msg: string) => show('error', msg), [show])
  const info = useCallback((msg: string) => show('info', msg), [show])

  return { toasts, show, success, error, info, dismiss }
}
