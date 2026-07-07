'use client'

import { useCallback, type WheelEvent } from 'react'
import { SYSTEM_LIKE_AGENT_KEYS } from './agent-team-display'
import { fireEmployee } from './mission-agents-api'
import type { TeamContainerHandlersData } from './team-container-handlers.types'

export function useTeamContainerNavigationHandlers(data: TeamContainerHandlersData) {
  const handleFireEmployee = useCallback(async () => {
    if (!data.selected) return
    if (SYSTEM_LIKE_AGENT_KEYS.has(data.selected.agent_key)) return
    const selectedLevel = data.selected.level ?? 'employee'
    if (selectedLevel !== 'employee' && selectedLevel !== 'manager') return
    data.setFiringEmployee(true)
    data.setFireError(null)
    try {
      const brainHasData = (data.fireBrainTotal ?? 0) > 0
      const handoff = brainHasData ? data.fireHandoff : null
      await fireEmployee(data.selected.agent_key, handoff)
      data.setShowFireConfirm(false)
      await data.loadAgents()
    } catch (err) {
      data.setFireError(err instanceof Error ? err.message : 'Failed to remove team member')
    } finally {
      data.setFiringEmployee(false)
    }
  }, [data])

  const scrollCarouselBy = useCallback(
    (delta: { left?: number; top?: number }) => {
      const el = data.carouselRef.current
      if (!el) return
      el.scrollBy({
        left: delta.left ?? 0,
        top: delta.top ?? 0,
        behavior: 'smooth',
      })
    },
    [data.carouselRef],
  )

  const handleCarouselWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      const el = data.carouselRef.current
      if (!el) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      el.scrollBy({ left: event.deltaY, top: 0, behavior: 'auto' })
    },
    [data.carouselRef],
  )

  const handleSessionChange = useCallback(
    (nextSessionId: string | null) => {
      if (nextSessionId == null) data.beginTeamSessionUrlDismiss()
      data.setSelectedSessionId(nextSessionId)
      data.syncTeamQuery(data.selectedAgentKey || null, nextSessionId)
    },
    [
      data.beginTeamSessionUrlDismiss,
      data.setSelectedSessionId,
      data.syncTeamQuery,
      data.selectedAgentKey,
    ],
  )

  const handleNavigateToConversation = useCallback(
    (params: { conversationId: string; messageId?: string; agentKey: string }) => {
      const match = data.agents.find((a) => a.agent_key === params.agentKey)
      if (match) data.setSelectedId(match.id)
      data.setSelectedSessionId(params.conversationId)
      data.syncTeamQuery(params.agentKey || null, params.conversationId)
      data.setAgentInfoOpen(false)
      data.setCampaignPanelOpen(false)
      if (params.messageId) {
        window.dispatchEvent(
          new CustomEvent('team-scroll-to-message', { detail: params.messageId }),
        )
      }
    },
    [
      data.agents,
      data.setSelectedId,
      data.setSelectedSessionId,
      data.syncTeamQuery,
      data.setAgentInfoOpen,
      data.setCampaignPanelOpen,
    ],
  )

  return {
    handleFireEmployee,
    scrollCarouselBy,
    handleCarouselWheel,
    handleSessionChange,
    handleNavigateToConversation,
  }
}
