'use client'

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { useConversationLocationLabel } from '@/components/conversations/use-conversation-location-label'
import {
  MISSION_DETAIL_FOCUS_EVENT,
  readMissionDetailFocusEvent,
  type MissionDetailFocus,
} from '@/lib/missions'
import {
  resolveChatSendAwarenessContext,
  type ChatSendFocusedArtifact,
} from './build-space-awareness-context'

/**
 * Tracks which mission detail panel is open (any surface) so chat sends can
 * carry the mission id without the panel and chat knowing about each other.
 */
function useFocusedMissionRef(): RefObject<MissionDetailFocus | null> {
  const focusedMissionRef = useRef<MissionDetailFocus | null>(null)
  useEffect(() => {
    const handleMissionFocus = (event: Event) => {
      focusedMissionRef.current = readMissionDetailFocusEvent(event)
    }
    window.addEventListener(MISSION_DETAIL_FOCUS_EVENT, handleMissionFocus as EventListener)
    return () =>
      window.removeEventListener(MISSION_DETAIL_FOCUS_EVENT, handleMissionFocus as EventListener)
  }, [])
  return focusedMissionRef
}

export function useChatSendAwareness(input: {
  awarenessContextOverride?: string | null
  isChannelScope: boolean
  channelAwareness?: string | null
  chatSurface?: string | null
  brainAwareness?: string | null
  teamAwareness?: string | null
  campaignId: string | null
  spaceId: string | null
  scopeMatchesVisibleSpace: boolean
  campaignName: string | null
  activeViewType?: string
  activeViewName?: string
  focusedArtifactRef: RefObject<ChatSendFocusedArtifact | null>
}): () => string {
  const connectedLocation = useConversationLocationLabel(input.campaignId, input.spaceId)
  const focusedMissionRef = useFocusedMissionRef()

  return useCallback(
    () =>
      resolveChatSendAwarenessContext({
        awarenessContextOverride: input.awarenessContextOverride,
        isChannelScope: input.isChannelScope,
        channelAwareness: input.channelAwareness,
        chatSurface: input.chatSurface,
        brainAwareness: input.brainAwareness,
        teamAwareness: input.teamAwareness,
        campaignId: input.campaignId,
        spaceId: input.spaceId,
        connectedLocationLabel: connectedLocation.label,
        scopeMatchesVisibleSpace: input.scopeMatchesVisibleSpace,
        campaignName: input.campaignName,
        activeViewType: input.activeViewType,
        activeViewName: input.activeViewName,
        focusedArtifact: input.focusedArtifactRef.current,
        focusedMission: focusedMissionRef.current,
      }),
    [
      connectedLocation.label,
      input.awarenessContextOverride,
      input.brainAwareness,
      input.campaignId,
      input.campaignName,
      input.channelAwareness,
      input.chatSurface,
      input.focusedArtifactRef,
      focusedMissionRef,
      input.isChannelScope,
      input.spaceId,
      input.scopeMatchesVisibleSpace,
      input.teamAwareness,
      input.activeViewName,
      input.activeViewType,
    ],
  )
}
