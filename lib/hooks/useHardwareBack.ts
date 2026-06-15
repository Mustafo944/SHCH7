import { useEffect, useRef } from 'react'

export function useHardwareBack(isActive: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack)

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useEffect(() => {
    // Only intercept if we are in an active sub-view/modal
    if (!isActive) return

    // Push a state to the history stack so the hardware back button triggers a popstate
    window.history.pushState({ pwaIntercept: true }, '')

    const handlePopState = () => {
      // When hardware back is pressed, trigger our custom onBack function
      onBackRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      // If the component unmounts or isActive becomes false programmatically (e.g., user clicked "Close" button),
      // we need to pop the state we pushed to keep the history clean.
      if (window.history.state?.pwaIntercept) {
        window.history.back()
      }
    }
  }, [isActive])
}
