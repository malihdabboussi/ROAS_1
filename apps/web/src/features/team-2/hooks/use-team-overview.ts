'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useOrgStore } from '@/lib/org'
import { createClient } from '@/lib/supabase/client'
import {
  emptyTeamOverviewPayload,
  fetchTeamOverview,
  type TeamOverviewPayload,
  type TeamOverviewRangeParams,
} from '../services/team-overview.service'
import {
  type RealtimeRow,
  updateAgentDelta,
  updateDelegationDelta,
  updateMissionDelta,
  updateTaskDelta,
  updateTraceDelta,
} from './use-team-overview-realtime'

const REFRESH_ON_FOCUS_AFTER_MS = 5 * 60_000

export function useTeamOverview(teamId: string, range?: TeamOverviewRangeParams) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [data, setData] = useState<TeamOverviewPayload>(() => emptyTeamOverviewPayload(teamId))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastFetchAtRef = useRef(0)
  const rangeStart = range?.start
  const rangeEnd = range?.end

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchTeamOverview(teamId, { start: rangeStart, end: rangeEnd })
      setData(next)
      lastFetchAtRef.current = Date.now()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load overview')
      setData(emptyTeamOverviewPayload(teamId))
    } finally {
      setLoading(false)
    }
  }, [teamId, rangeStart, rangeEnd])

  useEffect(() => {
    void reload()
  }, [activeOrgId, reload])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const supabase = createClient()
    let closed = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (closed) return
      const scopeFilter = activeOrgId
        ? `org_id=eq.${activeOrgId}`
        : user?.id
          ? `user_id=eq.${user.id}`
          : null
      if (!scopeFilter) return

      channel = supabase
        .channel(`team-overview:${teamId}:${activeOrgId ?? user?.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'missions', filter: scopeFilter },
          (payload) => {
            const row = (payload.new ?? payload.old) as RealtimeRow
            setData((prev) => updateMissionDelta(prev, row))
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'space_items', filter: scopeFilter },
          (payload) => {
            const row = (payload.new ?? payload.old) as RealtimeRow
            setData((prev) => updateTaskDelta(prev, row))
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vb_agent_traces', filter: scopeFilter },
          (payload) => {
            const row = (payload.new ?? payload.old) as RealtimeRow
            setData((prev) => updateTraceDelta(prev, row))
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'agent_delegations', filter: scopeFilter },
          (payload) => {
            const row = (payload.new ?? payload.old) as RealtimeRow
            setData((prev) => updateDelegationDelta(prev, row))
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'agents_registry', filter: scopeFilter },
          (payload) => {
            const row = (payload.new ?? payload.old) as RealtimeRow
            setData((prev) => updateAgentDelta(prev, row, teamId))
          },
        )
        .subscribe()
    })()

    const onFocus = () => {
      if (Date.now() - lastFetchAtRef.current > REFRESH_ON_FOCUS_AFTER_MS) void reload()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      closed = true
      window.removeEventListener('focus', onFocus)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [activeOrgId, reload, teamId])

  return { data, loading, error, reload }
}
