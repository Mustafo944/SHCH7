'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface RealtimeConfig {
  channelName: string
  table: string
  filter?: string
  onEvent: () => void
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
  // configs ni ref da saqlash — har renderda yangi massiv yaratilsa ham, qayta subscribe bo'lmaydi
  const configsRef = useRef(configs)
  configsRef.current = configs

  // Stabil kalit — faqat kanallar o'zgarganda qayta ulash uchun
  const configKey = configs.map(c => c.channelName + c.table + (c.filter || '')).join(',')

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
          () => cfg.onEvent()
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, configKey])
}
