'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBrainStore } from '../store/use-brain-store'

interface UseBrainHealthRealtimeOptions {
  agentId?: string | null
  brainId?: string | null
  enabled?: boolean
}

export function useBrainHealthRealtime(options?: UseBrainHealthRealtimeOptions) {
  const enabled = options?.enabled !== false
  const agentId = options?.agentId ?? null
  const brainId = options?.brainId ?? null
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    let mounted = true

    const scheduleRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const { loadHealth } = useBrainStore.getState()
        void loadHealth(agentId ?? undefined, brainId ?? undefined)
      }, 500)
    }

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted || !user) return

      const channel = supabase.channel(`brain-health-${user.id}-${brainId ?? agentId ?? 'default'}`)

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'brain_import_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        () => scheduleRefresh(),
      )

      if (brainId) {
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ns_memories',
            filter: `brain_id=eq.${brainId}`,
          },
          () => scheduleRefresh(),
        )
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ns_sk_entries',
            filter: `brain_id=eq.${brainId}`,
          },
          () => scheduleRefresh(),
        )
      } else {
        channel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ns_memories' },
          () => scheduleRefresh(),
        )
        channel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ns_sk_entries' },
          () => scheduleRefresh(),
        )
      }

      channel.subscribe()
      channelRef.current = channel
    }

    void subscribe()

    return () => {
      mounted = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (channelRef.current) {
        void createClient().removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, agentId, brainId])
}
