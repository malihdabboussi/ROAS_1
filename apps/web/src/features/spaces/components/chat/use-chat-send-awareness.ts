'use client'

import { useCallback, type RefObject } from 'react'
import { useConversationLocationLabel } from '@/components/conversations/use-conversation-location-label'
import {
  resolveChatSendAwarenessContext,
  type ChatSendFocusedArtifact,
} from './build-space-awareness-context'

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
      input.isChannelScope,
      input.spaceId,
      input.scopeMatchesVisibleSpace,
      input.teamAwareness,
      input.activeViewName,
      input.activeViewType,
    ],
  )
}
