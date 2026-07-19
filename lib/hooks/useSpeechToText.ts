'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// TypeScript'ning standart DOM lib'ida Web Speech API tiplari yo'q —
// shuning uchun minimal shakl bu yerda `any` orqali ishlatiladi.

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

function getRecognitionCtor(): any {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

/**
 * Brauzerning Web Speech API'si orqali ovozni matnga aylantiradi.
 * iOS'da ATAYIN o'chirilgan: Safari'ning implementatsiyasi beqaror va
 * iPhone foydalanuvchisi klaviaturasining o'z diktovka tugmasidan
 * (allaqachon a'lo ishlaydi) foydalansa bo'ladi.
 *
 * `startListening` chaqirilganda shu SESSIYA davomidagi barcha "final"
 * natijalar birlashtirilib, har safar TO'LIQ (kumulyativ) matn
 * `onUpdate`ga uzatiladi — chaqiruvchi tomon eski qiymatga ustidan
 * yozib qo'yishi (stale closure) mumkin bo'lgan holatlarning oldini olish uchun.
 */
export function useSpeechToText(lang = 'uz-UZ') {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')
  const onUpdateRef = useRef<((text: string) => void) | null>(null)

  useEffect(() => {
    setIsSupported(!isIOS() && getRecognitionCtor() !== null)
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const startListening = useCallback((onUpdate: (transcript: string) => void) => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    setError(null)
    transcriptRef.current = ''
    onUpdateRef.current = onUpdate

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (e: any) => {
      setError(e?.error === 'not-allowed' ? "Mikrofonga ruxsat berilmagan" : "Ovozni tanib bo'lmadi")
      setIsListening(false)
    }
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const chunk = (result[0]?.transcript || '').trim()
          if (chunk) {
            transcriptRef.current = transcriptRef.current ? `${transcriptRef.current} ${chunk}` : chunk
            onUpdateRef.current?.(transcriptRef.current)
          }
        }
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setError("Ovoz tanishni ishga tushirib bo'lmadi")
    }
  }, [lang])

  // Komponent unmount bo'lganda mikrofon ochiq qolib ketmasligi uchun
  useEffect(() => {
    return () => { recognitionRef.current?.stop() }
  }, [])

  return { isSupported, isListening, error, startListening, stopListening }
}
