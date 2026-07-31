'use client'

import { useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Supabase'dan keladigan `postgres_changes` hodisasi. */
export type RealtimeChangePayload = RealtimePostgresChangesPayload<Record<string, any>>

/** Bir xil (kanal, jadval) uchun hodisalarni birlashtirish oynasi. */
const COALESCE_WINDOW_MS = 300

interface RealtimeConfig {
  channelName: string
  table: string
  filter?: string
  /**
   * Hodisalarni birlashtirish (debounce) rejimi.
   *
   * `true` (standart) — {@link COALESCE_WINDOW_MS} ichida kelgan hodisalardan
   * faqat OXIRGISI yetkaziladi. Bu handler payload'ni ISHLATMAYDIGAN, ya'ni
   * ma'lumotni butunlay qayta yuklaydigan holatlar uchun to'g'ri: ommaviy
   * yangilanishda UI muzlab qolmaydi va ortiqcha so'rov ketmaydi.
   *
   * `false` — har bir hodisa alohida yetkaziladi. Handler `payload.new` ni
   * INKREMENTAL birlashtiradigan holatlarda MAJBURIY: aks holda birlashtirish
   * oynasi ichida o'zgargan boshqa qatorlarning hodisalari tashlab ketilib,
   * ular UI'da jimgina eskirib qolardi (faqat sahifa yangilanishida tuzalardi).
   */
  coalesce?: boolean
  onEvent: (payload: RealtimeChangePayload) => void
}

/**
 * Supabase Realtime kanallarini boshqaradi.
 * Component unmount bo'lganda avtomatik tozalanadi.
 */
export function useRealtimeSubscription(
  configs: RealtimeConfig[],
  enabled = true
) {
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([])
  const configsRef = useRef(configs)
  configsRef.current = configs

  // Stabil kalit — faqat kanallar o'zgarganda qayta ulash uchun
  const configKey = configs.map(c => c.channelName + c.table + (c.filter || '')).join(',')

  // Birlashtirish (debounce) taymerlari
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!enabled || configsRef.current.length === 0) return

    // Oldingi kanallarni tozalash
    channelsRef.current.forEach(ch => {
      supabase.removeChannel(ch)
    })
    channelsRef.current = []

    // Global xavfsizlik: Boshqa shu nomli kanallar qolib ketgan bo'lsa, hammasini tozalash
    configsRef.current.forEach(cfg => {
      const existingChannels = supabase.getChannels().filter(c => c.topic === `realtime:${cfg.channelName}`)
      existingChannels.forEach(c => supabase.removeChannel(c))
    })

    // Yangi kanallarni ochish
    const channels = configsRef.current.map(cfg => {
      const timeoutKey = `${cfg.channelName}_${cfg.table}`

      const channel = supabase
        .channel(cfg.channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: cfg.table,
            ...(cfg.filter ? { filter: cfg.filter } : {}),
          },
          (payload) => {
            // Konfiguratsiyaning eng so'nggi nusxasini olamiz (handler har
            // renderda yangilanadi, kanal esa qayta ulanmaydi).
            const latestCfg = configsRef.current.find(
              c => c.channelName === cfg.channelName && c.table === cfg.table
            )
            if (!latestCfg) return

            // Inkremental handler — hodisani DARHOL va TASHLAMASDAN yetkazamiz.
            if (latestCfg.coalesce === false) {
              latestCfg.onEvent(payload)
              return
            }

            // Qayta yuklaydigan handler — ommaviy o'zgarishda bitta chaqiruvga birlashtiramiz.
            const pending = timeoutsRef.current[timeoutKey]
            if (pending) clearTimeout(pending)
            timeoutsRef.current[timeoutKey] = setTimeout(() => {
              delete timeoutsRef.current[timeoutKey]
              latestCfg.onEvent(payload)
            }, COALESCE_WINDOW_MS)
          }
        )
        .subscribe()

      return channel
    })

    channelsRef.current = channels

    return () => {
      channelsRef.current.forEach(ch => {
        supabase.removeChannel(ch)
      })
      channelsRef.current = []
      Object.values(timeoutsRef.current).forEach(clearTimeout)
      timeoutsRef.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, configKey])
}
