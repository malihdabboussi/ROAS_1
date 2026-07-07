'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FlowBuildSessionSummary } from '@vibey/api-shared/types/flow-builder'
import { createClient } from '@/lib/supabase/client'
import {
  fetchFlowBuildSession,
  fetchLatestFlowBuildSession,
} from '../services/flows.service'

export function useFlowBuildSession(
  spaceId: string | null,
  conversationId: string | null = null,
  sessionId: string | null = null,
) {
  const [summary, setSummary] = useState<FlowBuildSessionSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async (): Promise<FlowBuildSessionSummary | null> => {
    if (!spaceId) {
      setSummary(null)
      setLoading(false)
      return null
    }
    setLoading(true)
    try {
      const next = sessionId
        ? await fetchFlowBuildSession(spaceId, sessionId)
        : await fetchLatestFlowBuildSession(spaceId, { conversationId })
      setSummary(next)
      return next
    } finally {
      setLoading(false)
    }
  }, [conversationId, sessionId, spaceId])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const load = async () => {
      if (!spaceId) {
        setSummary(null)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const next = sessionId
          ? await fetchFlowBuildSession(spaceId, sessionId)
          : await fetchLatestFlowBuildSession(spaceId, { conversationId })
        if (!cancelled) setSummary(next)
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
    const channelKey = sessionId ?? conversationId ?? 'latest'
    const channel = supabase
      .channel(`flow-build-session:${spaceId}:${channelKey}`)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_flow_build_clarification',
          filter: `space_id=eq.${spaceId}`,
        },
        () => void load(),
      )
      .subscribe()
    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [conversationId, sessionId, spaceId])

  return {
    summary,
    session: summary?.session ?? null,
    plan: summary?.plan ?? null,
    evaluation: summary?.evaluation ?? null,
    requiredNextAction: summary?.required_next_action ?? null,
    inspectorStage: summary?.inspector_stage ?? null,
    loading,
    refresh,
  }
}
