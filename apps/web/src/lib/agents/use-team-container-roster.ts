'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type SetStateAction } from 'react'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { createClient } from '@/lib/supabase/client'
import type { Mission } from '@/lib/missions'
import { fetchMissions } from '@/lib/missions'
import {
  backfillBrainScholar,
  backfillMissingAvatars,
  fetchMissionAgents,
  type MissionAgent,
} from './mission-agents-api'
import { cachedAgents } from './use-mission-agents'

export type TeamContainerSearchParams = Pick<URLSearchParams, 'get' | 'toString'>

type TeamContainerRouter = {
  replace: (href: string, options?: { scroll?: boolean }) => void
}

type UseTeamContainerRosterParams = {
  activeOrgId: string | null
  pathname: string
  router: TeamContainerRouter
  searchParams: TeamContainerSearchParams
  selectedAgentKeyFromUrl: string | null
  selectedSessionIdFromUrl: string | null
}

export function useTeamContainerRoster({
  activeOrgId,
  pathname,
  router,
  searchParams,
  selectedAgentKeyFromUrl,
  selectedSessionIdFromUrl,
}: UseTeamContainerRosterParams) {
  const [agents, setAgents] = useState<MissionAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionIdState] = useState<string | null>(null)
  const [selectedSessionTitle, setSelectedSessionTitle] = useState<string | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [mobileTeamView, setMobileTeamView] = useState<'card' | 'chat'>('card')
  const [isMobile, setIsMobile] = useState(false)

  const sessionUrlDismissPendingRef = useRef(false)
  const loadAgentsRequestIdRef = useRef(0)
  const agentsListLoadedOnceRef = useRef(false)
  const previousAgentKeyRef = useRef<string | null>(null)
  const initialAgentKeyRef = useRef(selectedAgentKeyFromUrl)
  const searchParamsRef: MutableRefObject<TeamContainerSearchParams> = useRef(searchParams)
  searchParamsRef.current = searchParams

  const selected =
    agents.find((a) => a.id === selectedId) ??
    agents.find((a) => a.agent_key === 'vibey') ??
    agents[0] ??
    null
  const selectedAgentKey = selected?.agent_key ?? ''
  const selectedModelId =
    (selected?.config as Record<string, string> | undefined)?.model_id || 'auto'

  const setSelectedSessionId = useCallback((value: SetStateAction<string | null>) => {
    setSelectedSessionIdState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      if (next != null) sessionUrlDismissPendingRef.current = false
      return next
    })
  }, [])

  const beginTeamSessionUrlDismiss = useCallback(() => {
    sessionUrlDismissPendingRef.current = true
  }, [])

  const loadAgents = useCallback(async (selectAgentKey?: string) => {
    const requestId = ++loadAgentsRequestIdRef.current
    try {
      if (agentsListLoadedOnceRef.current) invalidateCachedFetch('agents:list')
      fetchMissions()
        .then((missionData) => {
          if (requestId === loadAgentsRequestIdRef.current) setMissions(missionData)
        })
        .catch(() => {})
      const data = await cachedFetch('agents:list', fetchMissionAgents, { ttlMs: 60_000 })
      agentsListLoadedOnceRef.current = true
      if (requestId !== loadAgentsRequestIdRef.current) return
      setAgents(data)
      try {
        cachedAgents.mutate(data)
      } catch {
        /* noop - cache is best-effort */
      }
      const hasAtlas = data.some((a) => a.agent_key === 'atlas')
      if (!hasAtlas) {
        backfillBrainScholar()
          .then((res) => {
            if (res.created) void loadAgents(selectAgentKey)
          })
          .catch(() => {})
      }
      const hasMissingAvatars = data.some((a) => !a.image_url && a.agent_key !== 'vibey')
      if (hasMissingAvatars) {
        backfillMissingAvatars()
          .then((res) => {
            if (res.triggered > 0) setTimeout(() => void loadAgents(selectAgentKey), 8000)
          })
          .catch(() => {})
      }
      setSelectedId((previousSelectedId) => {
        let nextSelectedId: string | null = null
        if (selectAgentKey) {
          const selectedByKey = data.find((agent) => agent.agent_key === selectAgentKey)
          if (selectedByKey) nextSelectedId = selectedByKey.id
        }
        if (
          !nextSelectedId &&
          previousSelectedId &&
          data.some((agent) => agent.id === previousSelectedId)
        ) {
          nextSelectedId = previousSelectedId
        }
        if (!nextSelectedId) {
          try {
            const lastKey = localStorage.getItem('team-last-agent-key')
            if (lastKey) {
              const lastAgent = data.find((agent) => agent.agent_key === lastKey)
              if (lastAgent) nextSelectedId = lastAgent.id
            }
          } catch {}
        }
        if (!nextSelectedId) {
          const vibey = data.find((agent) => agent.agent_key === 'vibey')
          nextSelectedId = vibey?.id ?? data[0]?.id ?? null
        }
        return nextSelectedId
      })
    } finally {
      if (requestId === loadAgentsRequestIdRef.current) setLoading(false)
    }
  }, [])

  const syncTeamQuery = useCallback(
    (agentKey: string | null, sessionId: string | null) => {
      const nextAgent = agentKey && agentKey.trim().length > 0 ? agentKey : null
      const nextSession = sessionId && sessionId.trim().length > 0 ? sessionId : null
      const sp = searchParamsRef.current
      const currentAgent = sp.get('agent')
      const currentSession = sp.get('session')
      if (currentAgent === nextAgent && currentSession === nextSession) return
      const params = new URLSearchParams(sp.toString())
      if (nextAgent) params.set('agent', nextAgent)
      else params.delete('agent')
      if (nextSession) params.set('session', nextSession)
      else params.delete('session')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const handler = () => setMobileTeamView('chat')
    window.addEventListener('mobile-team-back-to-chat', handler)
    return () => window.removeEventListener('mobile-team-back-to-chat', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => setSelectedSessionTitle((e as CustomEvent<string>).detail)
    window.addEventListener('mobile-team-session-title', handler)
    return () => window.removeEventListener('mobile-team-session-title', handler)
  }, [])

  useEffect(() => {
    void loadAgents(initialAgentKeyRef.current ?? undefined)
  }, [loadAgents])

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null
    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted || !user) return
      channel = supabase
        .channel(`team-agents-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agents_registry',
            filter: activeOrgId ? `org_id=eq.${activeOrgId}` : `user_id=eq.${user.id}`,
          },
          () => {
            if (mounted) void loadAgents()
          },
        )
        .subscribe()
    }
    void subscribe()
    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [activeOrgId, loadAgents])

  useEffect(() => {
    if (!selectedAgentKeyFromUrl) return
    const selectedByKey = agents.find((agent) => agent.agent_key === selectedAgentKeyFromUrl)
    if (selectedByKey)
      setSelectedId((prev) => (prev === selectedByKey.id ? prev : selectedByKey.id))
  }, [agents, selectedAgentKeyFromUrl])

  useEffect(() => {
    if (selectedAgentKey) {
      try {
        localStorage.setItem('team-last-agent-key', selectedAgentKey)
      } catch {}
    }
  }, [selectedAgentKey])

  const syncTeamQueryRef = useRef(syncTeamQuery)
  syncTeamQueryRef.current = syncTeamQuery
  useEffect(() => {
    const previousAgentKey = previousAgentKeyRef.current
    previousAgentKeyRef.current = selectedAgentKey || null
    if (!selectedAgentKey) return
    if (!selectedAgentKeyFromUrl) {
      if (previousAgentKey && previousAgentKey !== selectedAgentKey) {
        setSelectedSessionId(null)
        syncTeamQueryRef.current(selectedAgentKey, null)
      }
      return
    }
    if (!previousAgentKey || previousAgentKey === selectedAgentKey) {
      if (selectedAgentKeyFromUrl && selectedAgentKeyFromUrl !== selectedAgentKey) return
      syncTeamQueryRef.current(selectedAgentKey, selectedSessionIdFromUrl)
      return
    }
    setSelectedSessionId(null)
    syncTeamQueryRef.current(selectedAgentKey, null)
  }, [selectedAgentKey, selectedAgentKeyFromUrl, selectedSessionIdFromUrl, setSelectedSessionId])

  useEffect(() => {
    if (!selectedAgentKey) return
    if (!selectedSessionIdFromUrl) {
      sessionUrlDismissPendingRef.current = false
      setSelectedSessionId(null)
      return
    }
    if (sessionUrlDismissPendingRef.current) return
    setSelectedSessionId((prev) =>
      prev === selectedSessionIdFromUrl ? prev : selectedSessionIdFromUrl,
    )
  }, [selectedAgentKey, selectedSessionIdFromUrl, setSelectedSessionId])

  return {
    agents,
    setAgents,
    loading,
    selectedId,
    setSelectedId,
    selectedSessionId,
    setSelectedSessionId,
    beginTeamSessionUrlDismiss,
    selectedSessionTitle,
    missions,
    mobileTeamView,
    setMobileTeamView,
    isMobile,
    selected,
    selectedAgentKey,
    selectedModelId,
    searchParamsRef,
    loadAgents,
    syncTeamQuery,
  }
}
