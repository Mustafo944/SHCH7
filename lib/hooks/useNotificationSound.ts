import { useState, useEffect, useRef } from 'react'

export function playNotification() {
  try {
    if (typeof window !== 'undefined') {
      try {
        if (localStorage.getItem('smartshch_muted') === 'true') {
          return;
        }
      } catch (e) {}
    }
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = audioCtx.currentTime;

    // First tone (B5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, t); 
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(1.0, t + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(t);
    osc1.stop(t + 0.4);

    // Second tone (E6)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, t + 0.15);
    gain2.gain.setValueAtTime(0, t + 0.15);
    gain2.gain.linearRampToValueAtTime(1.0, t + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(t + 0.15);
    osc2.stop(t + 0.8);

  } catch (e) {
    console.error("Failed to play notification sound", e);
  }
}

export function useNotificationSound(pendingCount: number) {
  // Try to load mute state from localStorage to persist user preference
  const [isMuted, setIsMutedState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('smartshch_muted') === 'true'
      } catch (e) {
        return false
      }
    }
    return false
  })
  
  const prevCount = useRef(pendingCount)

  const setIsMuted = (muted: boolean) => {
    setIsMutedState(muted)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smartshch_muted', muted.toString())
      } catch (e) {}
      window.dispatchEvent(new Event('smartshch_mute_changed'))
    }
  }

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'smartshch_muted') {
        setIsMutedState(e.newValue === 'true')
      }
    }
    const handleCustom = () => {
      setIsMutedState(localStorage.getItem('smartshch_muted') === 'true')
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('smartshch_mute_changed', handleCustom)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('smartshch_mute_changed', handleCustom)
    }
  }, [])

  useEffect(() => {
    // Only play sound when pending count INCREASES
    if (pendingCount > prevCount.current) {
      if (!isMuted) {
        playNotification()
      }
    }
    prevCount.current = pendingCount
  }, [pendingCount, isMuted])

  return { isMuted, setIsMuted }
}
