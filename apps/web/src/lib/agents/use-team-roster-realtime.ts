'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Mission } from '@/lib/missions'
import { fetchMissions } from '@/lib/missions'
import { applyAgentsRegistryRealtimeDelta } from './apply-agents-registry-realtime-delta'
import type { MissionAgent } from './mission-agents-api'
import { cachedAgents } from './use-mission-agents'

type UseTeamRosterRealtimeParams = {
  activeOrgId: string | null
  setAgents: Dispatch<SetStateAction<MissionAgent[]>>
  setMissions: Dispatch<SetStateAction<Mission[]>>
  loadAgents: () => Promise<void>
}

export function useTeamRosterRealtime({
  activeOrgId,
  setAgents,
  setMissions,
  loadAgents,
}: UseTeamRosterRealtimeParams) {
  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null
    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted || !user) return
      const scopeFilter = activeOrgId ? `org_id=eq.${activeOrgId}` : `user_id=eq.${user.id}`
      channel = supabase
        .channel(`team-agents-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agents_registry',
            filter: scopeFilter,
          },
          (payload) => {
            if (!mounted) return
            if (payload.eventType === 'INSERT') {
              void loadAgents()
              return
            }
            const row = (payload.new ?? payload.old) as Record<string, unknown> | null
            setAgents((prev) => {
              const next = applyAgentsRegistryRealtimeDelta(prev, payload.eventType, row)
              try {
                cachedAgents.mutate(next)
              } catch {
                /* noop - cache is best-effort */
              }
              return next
            })
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'missions',
            filter: scopeFilter,
          },
          () => {
            if (!mounted) return
            void fetchMissions()
              .then((missionData) => {
                if (mounted) setMissions(missionData)
              })
              .catch(() => {})
          },
        )
        .subscribe()
    }
    void subscribe()
    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [activeOrgId, loadAgents, setAgents, setMissions])
}
