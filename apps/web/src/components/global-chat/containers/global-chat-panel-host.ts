import { useRef } from 'react'
import type { GlobalWorkContext } from '../lib/global-chat-storage'

export interface GlobalChatPanelHost {
  panelKey: string
  spaceId: string | undefined
  campaignId: string | null
}

/**
 * Conversation host for the rail panel. Detaching work context (chip X → general)
 * must not remount the panel or swap the conversation list — only clear agent awareness.
 */
export function resolveGlobalChatPanelHost(input: {
  isChannelRoute: boolean
  channelId: string | null
  isSpacesRoute: boolean
  forceGeneral?: boolean
  activeSpaceId: string | null
  activeSpaceCampaignId: string | null
  workContext: GlobalWorkContext
  sticky: GlobalChatPanelHost | null
}): GlobalChatPanelHost {
  const { workContext } = input

  if (input.isChannelRoute && input.channelId) {
    return {
      panelKey: `channel:${input.channelId}`,
      spaceId: undefined,
      campaignId: null,
    }
  }

  if (input.forceGeneral) {
    return {
      panelKey: 'general',
      spaceId: undefined,
      campaignId: null,
    }
  }

  const routeSpaceId = input.isSpacesRoute ? (input.activeSpaceId ?? undefined) : undefined
  const attachedSpaceId =
    workContext.surface === 'spaces' && workContext.spaceId ? workContext.spaceId : undefined
  const spaceId = routeSpaceId ?? attachedSpaceId
  if (spaceId) {
    const campaignId =
      workContext.campaignId ??
      (spaceId === input.activeSpaceId ? input.activeSpaceCampaignId : null) ??
      null
    return {
      panelKey: `space:${spaceId}:${campaignId ?? 'personal'}`,
      spaceId,
      campaignId,
    }
  }

  if (workContext.surface === 'general' && input.sticky?.spaceId) {
    return input.sticky
  }

  return {
    panelKey: 'general',
    spaceId: undefined,
    campaignId: null,
  }
}

export function useStickyGlobalChatPanelHost(
  input: Omit<Parameters<typeof resolveGlobalChatPanelHost>[0], 'sticky'>,
): GlobalChatPanelHost {
  const stickyRef = useRef<GlobalChatPanelHost | null>(null)
  const host = resolveGlobalChatPanelHost({ ...input, sticky: stickyRef.current })
  if (host.spaceId || host.panelKey.startsWith('channel:')) {
    stickyRef.current = host
  }
  return host
}
