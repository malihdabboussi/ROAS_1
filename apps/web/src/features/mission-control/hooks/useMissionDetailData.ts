import { useCallback, useEffect, useRef, useState } from 'react'
import { backendGet } from '@/lib/api/backend-client'
import { createClient } from '@/lib/supabase/client'
import {
  fetchMissionAccessRequests,
  fetchMissionAgents,
  fetchMissionById,
  fetchMissionDeliverables,
  fetchMissionLogs,
  fetchMissionPlan,
  fetchSubtasks,
} from '../services/missions.service'
import type {
  Mission,
  MissionAccessRequest,
  MissionAgent,
  MissionDeliverable,
  MissionLog,
  MissionPrd,
  MissionSubtask,
} from '../types'

interface UseMissionDetailDataParams {
  mission: Mission
}

type RealtimeKind = 'mission' | 'logs' | 'deliverables' | 'subtasks' | 'plan' | 'agents' | 'access'

export function useMissionDetailData({ mission }: UseMissionDetailDataParams) {
  const [prd, setPrd] = useState<MissionPrd | null>(null)
  const [prdLoading, setPrdLoading] = useState(true)
  const [liveMission, setLiveMission] = useState<Mission | null>(null)
  const [missionLogs, setMissionLogs] = useState<MissionLog[]>([])
  const [deliverables, setDeliverables] = useState<MissionDeliverable[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [subtasks, setSubtasks] = useState<MissionSubtask[]>([])
  const [accessRequests, setAccessRequests] = useState<MissionAccessRequest[]>([])
  const [agents, setAgents] = useState<MissionAgent[]>([])
  const [userProfile, setUserProfile] = useState<{
    fullName: string
    avatarUrl: string | null
  } | null>(null)
  const loadInFlightRef = useRef<Promise<void> | null>(null)
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const realtimePendingKindsRef = useRef<Set<RealtimeKind>>(new Set())
  const realtimeFlushInFlightRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    setLiveMission(null)
  }, [mission.id])

  useEffect(() => {
    const loadUserProfile = async () => {
      const profile = await backendGet<{
        full_name: string
        avatar_url: string | null
        email?: string
      }>('/api/profile').catch(() => null)
      if (!profile) return
      setUserProfile({
        fullName: profile.full_name || profile.email?.split('@')[0] || 'You',
        avatarUrl: profile.avatar_url ?? null,
      })
    }
    void loadUserProfile()
  }, [])

  useEffect(() => {
    fetchMissionAgents()
      .then(setAgents)
      .catch(() => setAgents([]))
  }, [])

  useEffect(() => {
    const loadPlan = async () => {
      const plan = await fetchMissionPlan(mission.id)
      if (plan) {
        setPrd({
          id: plan.id,
          mission_id: mission.id,
          content: plan.content as MissionPrd['content'],
          version: plan.version,
          created_at: plan.created_at,
          updated_at: plan.updated_at,
        })
      } else {
        setPrd(null)
      }
      setPrdLoading(false)
    }
    void loadPlan()
  }, [mission.id])

  const loadAllData = useCallback(async () => {
    if (loadInFlightRef.current) {
      await loadInFlightRef.current
      return
    }

    const run = (async () => {
      try {
        const [m, logs, dels, sts, access] = await Promise.all([
          fetchMissionById(mission.id),
          fetchMissionLogs(mission.id),
          fetchMissionDeliverables(mission.id),
          fetchSubtasks(mission.id).catch(() => []),
          fetchMissionAccessRequests(mission.id).catch(() => []),
        ])
        setLiveMission(m)
        setMissionLogs(logs)
        setDeliverables(dels)
        setSubtasks(sts)
        setAccessRequests(access)
      } catch {
        setLiveMission(null)
        setMissionLogs([])
        setDeliverables([])
        setAccessRequests([])
      } finally {
        setLogsLoading(false)
      }
    })()

    loadInFlightRef.current = run
    await run
    loadInFlightRef.current = null
  }, [mission.id])

  const loadMissionOnly = useCallback(async () => {
    try {
      const data = await fetchMissionById(mission.id)
      setLiveMission(data)
    } catch {
      setLiveMission(null)
    }
  }, [mission.id])

  const loadLogsOnly = useCallback(async () => {
    try {
      const data = await fetchMissionLogs(mission.id)
      setMissionLogs(data)
    } catch {
      setMissionLogs([])
    }
  }, [mission.id])

  const loadDeliverablesOnly = useCallback(async () => {
    try {
      const data = await fetchMissionDeliverables(mission.id)
      setDeliverables(data)
    } catch {
      setDeliverables([])
    }
  }, [mission.id])

  const loadSubtasksOnly = useCallback(async () => {
    try {
      const data = await fetchSubtasks(mission.id)
      setSubtasks(data)
    } catch {
      setSubtasks([])
    }
  }, [mission.id])

  const loadAccessRequestsOnly = useCallback(async () => {
    try {
      const data = await fetchMissionAccessRequests(mission.id)
      setAccessRequests(data)
    } catch {
      setAccessRequests([])
    }
  }, [mission.id])

  const loadPlanOnly = useCallback(async () => {
    const plan = await fetchMissionPlan(mission.id)
    if (plan) {
      setPrd({
        id: plan.id,
        mission_id: mission.id,
        content: plan.content as MissionPrd['content'],
        version: plan.version,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      })
    } else {
      setPrd(null)
    }
  }, [mission.id])

  const loadAgentsOnly = useCallback(async () => {
    try {
      // Reacts to realtime `agents_registry` changes — bypass the 60s list cache.
      const data = await fetchMissionAgents({ force: true })
      setAgents(data)
    } catch {
      setAgents([])
    }
  }, [])

  const flushRealtimeUpdates = useCallback(async () => {
    if (realtimeFlushInFlightRef.current) return
    realtimeFlushInFlightRef.current = (async () => {
      const kinds = Array.from(realtimePendingKindsRef.current)
      realtimePendingKindsRef.current.clear()
      if (!kinds.length) return

      await Promise.all(
        kinds.map(async (kind) => {
          if (kind === 'mission') return loadMissionOnly()
          if (kind === 'logs') return loadLogsOnly()
          if (kind === 'deliverables') return loadDeliverablesOnly()
          if (kind === 'subtasks') return loadSubtasksOnly()
          if (kind === 'plan') return loadPlanOnly()
          if (kind === 'access') return loadAccessRequestsOnly()
          return loadAgentsOnly()
        }),
      )
    })()

    await realtimeFlushInFlightRef.current
    realtimeFlushInFlightRef.current = null

    if (realtimePendingKindsRef.current.size > 0) {
      void flushRealtimeUpdates()
    }
  }, [
    loadAgentsOnly,
    loadAccessRequestsOnly,
    loadDeliverablesOnly,
    loadLogsOnly,
    loadMissionOnly,
    loadPlanOnly,
    loadSubtasksOnly,
  ])

  const enqueueRealtimeUpdate = useCallback(
    (kind: RealtimeKind) => {
      realtimePendingKindsRef.current.add(kind)
      if (realtimeTimerRef.current) return
      realtimeTimerRef.current = setTimeout(() => {
        realtimeTimerRef.current = null
        void flushRealtimeUpdates()
      }, 600)
    },
    [flushRealtimeUpdates],
  )

  useEffect(() => {
    void loadAllData()
  }, [loadAllData])

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    const channels: Array<ReturnType<typeof supabase.channel>> = []

    const run = async () => {
      if (cancelled) return
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled || !user) return

      const mid = mission.id
      const detailCh = supabase
        .channel(`mission-detail-${mid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'missions', filter: `id=eq.${mid}` },
          () => enqueueRealtimeUpdate('mission'),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'missions_logs', filter: `mission_id=eq.${mid}` },
          () => enqueueRealtimeUpdate('logs'),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mission_deliverables',
            filter: `mission_id=eq.${mid}`,
          },
          () => enqueueRealtimeUpdate('deliverables'),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mission_subtasks',
            filter: `mission_id=eq.${mid}`,
          },
          () => enqueueRealtimeUpdate('subtasks'),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mission_agent_access_requests',
            filter: `mission_id=eq.${mid}`,
          },
          () => enqueueRealtimeUpdate('access'),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'missions_plans', filter: `mission_id=eq.${mid}` },
          () => enqueueRealtimeUpdate('plan'),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agents_registry',
            filter: `user_id=eq.${user.id}`,
          },
          () => enqueueRealtimeUpdate('agents'),
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && !cancelled) {
            enqueueRealtimeUpdate('logs')
            enqueueRealtimeUpdate('mission')
          }
        })

      if (cancelled) {
        void supabase.removeChannel(detailCh)
        return
      }
      channels.push(detailCh)
    }

    void run()

    return () => {
      cancelled = true
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current)
        realtimeTimerRef.current = null
      }
      realtimePendingKindsRef.current.clear()
      for (const ch of channels) {
        void supabase.removeChannel(ch)
      }
    }
  }, [enqueueRealtimeUpdate, mission.id])

  return {
    prd,
    prdLoading,
    liveMission,
    missionLogs,
    deliverables,
    accessRequests,
    logsLoading,
    subtasks,
    agents,
    userProfile,
    loadAllData,
    setMissionLogs,
    setSubtasks,
    setAccessRequests,
  }
}
