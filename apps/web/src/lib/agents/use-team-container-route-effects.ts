'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import {
  createNewConversation,
  getOrCreateAgentConversation,
  sendMessageStreaming,
} from '@/lib/chat/studio-chat-runtime-adapter'
import {
  fetchAwarenessPoints,
  markAgentOnboardingComplete,
  markAwarenessPointsReadAll,
  type MissionAgent,
} from './mission-agents-api'
import type { TeamContainerSearchParams } from './use-team-container-roster'

type TeamContainerRouter = {
  replace: (href: string, options?: { scroll?: boolean }) => void
}

type UseTeamContainerRouteEffectsParams = {
  agents: MissionAgent[]
  hireFilterParam: string | null
  hireFilterRef: MutableRefObject<string | null>
  hireParam: string | null
  injectAwarenessParam: string | null
  loading: boolean
  pathname: string
  promptParam: string | null
  router: TeamContainerRouter
  searchParamsRef: MutableRefObject<TeamContainerSearchParams>
  selectedAgentKeyFromUrl: string | null
  setSelectedId: (id: string | null) => void
  setSelectedSessionId: (id: string | null) => void
  setShowReadyEmployees: (open: boolean) => void
}

export function useTeamContainerRouteEffects({
  agents,
  hireFilterParam,
  hireFilterRef,
  hireParam,
  injectAwarenessParam,
  loading,
  pathname,
  promptParam,
  router,
  searchParamsRef,
  selectedAgentKeyFromUrl,
  setSelectedId,
  setSelectedSessionId,
  setShowReadyEmployees,
}: UseTeamContainerRouteEffectsParams) {
  const awarenessInjectedRef = useRef(false)
  const onboardingKickoffStartedRef = useRef(false)
  const promptHandledRef = useRef(false)

  useEffect(() => {
    if (injectAwarenessParam !== 'true' || awarenessInjectedRef.current || loading) return
    const ceoAgent = agents.find((a) => a.level === 'c_level')
    if (!ceoAgent) return
    awarenessInjectedRef.current = true
    const run = async () => {
      const points = await fetchAwarenessPoints().catch(() => [])
      const unread = points.filter((p) => p.read_at === null)
      if (unread.length === 0) return
      const context = unread
        .slice(0, 50)
        .map((p) => `- [${p.point_type}] ${p.content}`)
        .join('\n')
      const convo = await getOrCreateAgentConversation(ceoAgent.agent_key)
      await sendMessageStreaming({
        conversation_id: convo.id,
        content: `Awareness context injected from Mission Control notifications:\n${context}\nAcknowledge you loaded this context and continue naturally.`,
        suppressUserMessage: true,
      }).catch(() => null)
      await markAwarenessPointsReadAll().catch(() => null)
    }
    void run().finally(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString())
      params.delete('inject_awareness')
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }, [injectAwarenessParam, loading, agents, pathname, router, searchParamsRef])

  useEffect(() => {
    if (hireParam === 'true' && !loading) {
      if (hireFilterParam) hireFilterRef.current = hireFilterParam
      setShowReadyEmployees(true)
      const params = new URLSearchParams(searchParamsRef.current.toString())
      params.delete('hire')
      params.delete('hireFilter')
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    }
  }, [
    hireParam,
    hireFilterParam,
    hireFilterRef,
    loading,
    pathname,
    router,
    searchParamsRef,
    setShowReadyEmployees,
  ])

  useEffect(() => {
    if (!promptParam || loading || promptHandledRef.current) return
    const targetKey = selectedAgentKeyFromUrl || 'vibey'
    const targetAgent = agents.find((a) => a.agent_key === targetKey)
    if (!targetAgent) return
    promptHandledRef.current = true
    const storageKey = getOrgScopedKey('team-pending-send-message')
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ agentKey: targetKey, content: promptParam }),
    )
    const params = new URLSearchParams(searchParamsRef.current.toString())
    params.delete('prompt')
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [
    promptParam,
    loading,
    agents,
    selectedAgentKeyFromUrl,
    pathname,
    router,
    searchParamsRef,
  ])

  useEffect(() => {
    const cLevel = agents.find((a) => a.level === 'c_level')
    if (!cLevel) return
    const cfg = (cLevel.config ?? {}) as Record<string, unknown>
    if (cfg.needs_onboarding_chat !== true) return
    if (onboardingKickoffStartedRef.current) return
    let cancelled = false
    const run = async () => {
      const convo = await createNewConversation({
        agent_id: cLevel.agent_key,
        title: 'Vibey Discovery',
      }).catch(() => null)
      if (cancelled) return
      onboardingKickoffStartedRef.current = true
      const sessionId = convo?.id ?? null
      if (!sessionId) return
      setSelectedId(cLevel.id)
      setSelectedSessionId(sessionId)
      const params = new URLSearchParams(searchParamsRef.current.toString())
      params.set('agent', cLevel.agent_key)
      params.set('session', sessionId)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      await markAgentOnboardingComplete(cLevel.agent_key).catch(() => null)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      let profileContext = ''
      if (user) {
        // eslint-disable-next-line no-restricted-syntax
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, company_name, industry, website, onboarding_data')
          .eq('id', user.id)
          .single()
        if (profile) {
          const onboardingData = (profile.onboarding_data ?? {}) as Record<string, unknown>
          const lines = [
            profile.full_name && `Name: ${profile.full_name}`,
            profile.company_name && `Company: ${profile.company_name}`,
            profile.industry && `Industry: ${profile.industry}`,
            profile.website && `Website: ${profile.website}`,
            onboardingData.role && `Role: ${onboardingData.role}`,
          ].filter(Boolean)
          if (lines.length > 0) profileContext = `\n${lines.join('\n')}\n`
        }
      }
      await sendMessageStreaming({
        conversation_id: sessionId,
        content: `Onboarding: First conversation after user signed up. Here is what we know from signup:${profileContext}\nUse your onboarding-discovery skill. Start with DEEP online research - scrape their website, search for the company, check LinkedIn, social presence, competitors. Build a complete picture before your first message. The user will wait. Then run the discovery protocol.`,
        suppressUserMessage: true,
      }).catch(() => null)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [agents, pathname, router, searchParamsRef, setSelectedId, setSelectedSessionId])
}
