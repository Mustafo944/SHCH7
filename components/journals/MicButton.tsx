'use client'

import { Mic } from 'lucide-react'
import { useSpeechToText } from '@/lib/hooks/useSpeechToText'

/**
 * Jurnal matn maydonlari (izoh/kamchilik) yoniga qo'yiladigan ovozli
 * kiritish tugmasi. Qo'llab-quvvatlanmagan brauzerlarda (jumladan iOS)
 * hech narsa render qilmaydi — funksionallik shart emas, faqat qulaylik.
 */
export function MicButton({
  baseText,
  onChange,
  disabled,
  className = '',
}: {
  /** Diktovka boshlanayotgan paytdagi maydon qiymati — yangi matn shunga qo'shiladi */
  baseText: string
  onChange: (newValue: string) => void
  disabled?: boolean
  className?: string
}) {
  const { isSupported, isListening, error, startListening, stopListening } = useSpeechToText('uz-UZ')

  if (!isSupported) return null

  const handleClick = () => {
    if (disabled) return
    if (isListening) {
      stopListening()
      return
    }
    const base = baseText.trim()
    startListening(transcript => {
      onChange(base ? `${base} ${transcript}` : transcript)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={error || (isListening ? "To'xtatish" : 'Ovozli kiritish')}
      className={`flex items-center justify-center rounded-lg p-1.5 shadow-sm border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
        isListening
          ? 'bg-red-500 text-white border-transparent shadow-red-500/30 animate-pulse'
          : 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-600 hover:text-white'
      } ${className}`}
    >
      <Mic size={12} strokeWidth={2.5} />
    </button>
  )
}
