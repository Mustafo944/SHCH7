'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface RealtimeConfig {
  channelName: string
  table: string
  filter?: string
  onEvent: (payload?: any) => void
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

  // Debounce timeouts ref
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})

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
          (payload) => {
            const latestCfg = configsRef.current.find(c => c.channelName === cfg.channelName && c.table === cfg.table)
            if (latestCfg) {
              // Debounce event by 500ms to prevent UI freezing on mass updates
              const timeoutKey = `${cfg.channelName}_${cfg.table}`
              if (timeoutsRef.current[timeoutKey]) {
                clearTimeout(timeoutsRef.current[timeoutKey])
              }
              timeoutsRef.current[timeoutKey] = setTimeout(() => {
                latestCfg.onEvent(payload)
                delete timeoutsRef.current[timeoutKey]
              }, 500)
            }
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
      // Clear timeouts on unmount
      Object.values(timeoutsRef.current).forEach(clearTimeout)
      timeoutsRef.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, configKey])
}
