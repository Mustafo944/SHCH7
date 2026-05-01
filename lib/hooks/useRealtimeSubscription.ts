'use client'

import { useEffect, useRef, useCallback } from 'react'
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

  const cleanup = useCallback(() => {
    channelsRef.current.forEach(ch => {
      supabase.removeChannel(ch)
    })
    channelsRef.current = []
  }, [])

  useEffect(() => {
    if (!enabled || configs.length === 0) return

    cleanup()

    const channels = configs.map(cfg => {
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

    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, configs.map(c => c.channelName + c.table + (c.filter || '')).join(','), cleanup])
}
