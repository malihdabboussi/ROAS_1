'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, type ReactNode } from 'react'
import { SpaceVibeyChatPanel } from '@/features/spaces/components/chat/SpaceVibeyChatPanel'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { QuickMissionsLauncherProvider } from '@/lib/missions'
import { ChatCampaignBrainNudge } from '../components/ChatCampaignBrainNudge'
import { ChatSurfaceRecommendation } from '../components/ChatSurfaceRecommendation'
import { QuickMissionsHubHost } from '../components/QuickMissionsHubHost'
import { useMeetingConversationAwareness } from '../hooks/use-meeting-conversation-awareness'
import { resolveMeetingChatPanel } from '../lib/resolve-meeting-chat-panel'
import { useGlobalChatStore } from '../store/use-global-chat-store'
import { useStickyGlobalChatPanelHost } from './global-chat-panel-host'

export function GlobalChatPanel({
  shellSidebarChrome = false,
  onCollapseChat,
  presentation = 'compact',
  headerLeadingAction,
  headerTrailingAction,
}: {
  shellSidebarChrome?: boolean
  onCollapseChat?: () => void
  presentation?: 'full' | 'compact'
  headerLeadingAction?: ReactNode
  headerTrailingAction?: ReactNode
} = {}) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const routeConversationId = searchParams.get('conv')?.trim() || null
  const workContext = useGlobalChatStore((s) => s.workContext)
  const storedMeetingContext = useGlobalChatStore((s) => s.meetingContext)
  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const clearMeetingContext = useGlobalChatStore((s) => s.clearMeetingContext)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpace = useMemo(
    () => spaces.find((space) => space.id === activeSpaceId) ?? null,
    [activeSpaceId, spaces],
  )

  const channelRouteMatch = pathname.match(/^\/home\/channels\/([^/]+)/)
  const channelId = channelRouteMatch?.[1] ?? workContext.channelId ?? null
  const isChannelRoute = Boolean(channelId && pathname.startsWith('/home/channels/'))
  const isSpacesRoute = pathname.startsWith('/spaces') || pathname.startsWith('/campaigns')
  const isAgencyWorkspaceRoute =
    pathname.startsWith('/clients') || pathname.startsWith('/client-campaigns')
  const host = useStickyGlobalChatPanelHost({
    isChannelRoute,
    channelId,
    isSpacesRoute,
    forceGeneral: isAgencyWorkspaceRoute,
    activeSpaceId,
    activeSpaceCampaignId: activeSpace?.campaign_id ?? null,
    workContext,
  })
  const {
    meetingContext,
    preferredConversationId: meetingPreferredConversationId,
    awarenessContext: meetingAwarenessContext,
  } = resolveMeetingChatPanel({
    storedMeetingContext,
    activeConversationId,
  })
  // /home?conv= (Service Request resume, Recents deep links) must prefer the URL
  // conversation even when meeting context is absent — otherwise the panel can
  // remount blank after pendingOpenConversationId is consumed.
  const preferredConversationId = meetingPreferredConversationId ?? routeConversationId
  const conversationAwareness = useMeetingConversationAwareness(activeConversationId)
  useEffect(() => {
    if (
      storedMeetingContext &&
      activeConversationId &&
      activeConversationId !== storedMeetingContext.conversationId
    ) {
      clearMeetingContext()
    }
  }, [activeConversationId, clearMeetingContext, storedMeetingContext])
  const spaceId = meetingContext?.spaceId ?? host.spaceId
  const awarenessSurface = meetingContext
    ? 'spaces'
    : isAgencyWorkspaceRoute || workContext.surface === 'general'
      ? 'general'
      : workContext.surface

  return (
    <QuickMissionsLauncherProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <QuickMissionsHubHost />
        <ChatSurfaceRecommendation />
        <ChatCampaignBrainNudge />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SpaceVibeyChatPanel
            key={
              meetingContext ? `meeting:${meetingContext.conversationId ?? spaceId}` : host.panelKey
            }
            chatSurface={awarenessSurface}
            spaceId={spaceId}
            campaignId={
              awarenessSurface === 'spaces'
                ? (host.campaignId ?? activeSpace?.campaign_id ?? null)
                : null
            }
            campaignName={
              awarenessSurface === 'spaces' && isSpacesRoute ? (activeSpace?.title ?? null) : null
            }
            preferredConversationId={preferredConversationId}
            awarenessContextOverride={meetingAwarenessContext ?? conversationAwareness}
            brainContext={
              awarenessSurface === 'brain' && workContext.brainAwarenessContext
                ? {
                    brainId: workContext.brainId ?? null,
                    scopeLabel: workContext.brainScopeLabel ?? 'Brain',
                    awarenessContext: workContext.brainAwarenessContext,
                  }
                : undefined
            }
            teamOpsContext={
              awarenessSurface === 'team' && workContext.teamOpsAwarenessContext
                ? {
                    label: workContext.teamOpsLabel ?? 'Ops Desk',
                    awarenessContext: workContext.teamOpsAwarenessContext,
                  }
                : undefined
            }
            channelContext={
              isChannelRoute && channelId
                ? {
                    channelId,
                    channelName: workContext.channelName ?? 'Channel',
                    awarenessContext: workContext.channelAwarenessContext ?? '',
                  }
                : undefined
            }
            shellSidebarChrome={shellSidebarChrome}
            headerLayout={presentation}
            headerLeadingAction={headerLeadingAction}
            headerTrailingAction={headerTrailingAction}
            onCollapseChat={
              presentation === 'full'
                ? onCollapseChat
                : (onCollapseChat ?? (() => setCollapsed(true)))
            }
          />
        </div>
      </div>
    </QuickMissionsLauncherProvider>
  )
}
