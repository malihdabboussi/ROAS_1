'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchFlowBuildSessionLinks } from '../services/flows.service'
import type { FlowBuildSessionLink } from '../types/flow-build-session-link.types'

export function useFlowBuildSessionsList(spaceId: string | null) {
  const [sessions, setSessions] = useState<FlowBuildSessionLink[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!spaceId) {
      setSessions([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const rows = await fetchFlowBuildSessionLinks(spaceId)
      setSessions(rows)
    } finally {
      setLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const load = async () => {
      if (!spaceId) {
        setSessions([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const rows = await fetchFlowBuildSessionLinks(spaceId)
        if (!cancelled) setSessions(rows)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    if (!spaceId) {
      return () => {
        cancelled = true
      }
    }
    const channel = supabase
      .channel(`flow-build-sessions-list:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_flow_build_session',
          filter: `space_id=eq.${spaceId}`,
        },
        () => void load(),
      )
      .subscribe()
    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [spaceId])

  return { sessions, loading, refresh }
}
