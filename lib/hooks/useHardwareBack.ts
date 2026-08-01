import { useEffect, useRef } from 'react'

// ⚠️ VAQTINCHALIK DIAGNOSTIKA — "Boshlandi bosilganda asosiy sahifaga tashlash"
// bugini topish uchun. Sabab aniqlangach BU BLOK VA BARCHA `dbg(...)`
// chaqiruvlari OLIB TASHLANADI.
const dbg = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.log('[HW-BACK]', ...args)
}

export function useHardwareBack(isActive: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack)

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useEffect(() => {
    // Only intercept if we are in an active sub-view/modal
    if (!isActive) return

    dbg('EFFEKT ISHGA TUSHDI (pushState) — isActive=true')

    // Push a state to the history stack so the hardware back button triggers a popstate
    window.history.pushState({ pwaIntercept: true }, '')

    const handlePopState = () => {
      // When hardware back is pressed, trigger our custom onBack function
      dbg('POPSTATE keldi -> onBack() chaqirilyapti', { state: window.history.state })
      onBackRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      // If the component unmounts or isActive becomes false programmatically (e.g., user clicked "Close" button),
      // we need to pop the state we pushed to keep the history clean.
      const willGoBack = !!window.history.state?.pwaIntercept
      dbg('TOZALASH ishga tushdi', { willGoBack, state: window.history.state })
      if (willGoBack) {
        dbg('history.back() CHAQIRILYAPTI  <-- shu popstate uyg\'otadi!')
        window.history.back()
      }
    }
  }, [isActive])
}
