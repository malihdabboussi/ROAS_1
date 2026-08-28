'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, type ReactNode } from 'react'
import { buildMeetingFollowUpTaskReviewPrompt } from '@/features/home/config/meeting-post-call-actions.config'
import { updateMeetingActionStatus } from '@/features/home/services/meeting-workspace-api'
import { SpaceVibeyChatPanel } from '@/features/spaces/components/chat/SpaceVibeyChatPanel'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { QuickMissionsLauncherProvider } from '@/lib/missions'
import { updateSpaceItem } from '@/lib/spaces/spaces-api'
import { ChatCampaignBrainNudge } from '../components/ChatCampaignBrainNudge'
import { ChatSurfaceRecommendation } from '../components/ChatSurfaceRecommendation'
import { MeetingPostCallReviewCard } from '../components/MeetingPostCallReviewCard'
import { QuickMissionsHubHost } from '../components/QuickMissionsHubHost'
import { useMeetingConversationAwareness } from '../hooks/use-meeting-conversation-awareness'
import { useWorkRequestHomeChatSeed } from '../hooks/useWorkRequestHomeChatSeed'
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
  const chatParam = searchParams.get('chat')
  const freshChat = chatParam === 'starting' || chatParam === 'new'
  useWorkRequestHomeChatSeed()
  const workContext = useGlobalChatStore((s) => s.workContext)
  const storedMeetingContext = useGlobalChatStore((s) => s.meetingContext)
  const postCallReview = useGlobalChatStore((s) => s.postCallReview)
  const clearPostCallReview = useGlobalChatStore((s) => s.clearPostCallReview)
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
    pathname.startsWith('/clients') ||
    pathname.startsWith('/client-campaigns') ||
    pathname.startsWith('/launches')
  const host = useStickyGlobalChatPanelHost({
    isChannelRoute,
    channelId,
    isSpacesRoute,
    forceGeneral: isAgencyWorkspaceRoute,
    freshChat,
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
  // /home?conv= (Recents deep links, Service Request resume) is the user's explicit
  // pick — it must win over a lingering meeting context, which otherwise hijacks the
  // panel back to the meeting thread ("clicked chat opens, then goes away"). Meeting
  // preference still applies on meeting routes, which carry no conv param.
  const preferredConversationId = routeConversationId ?? meetingPreferredConversationId
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
        {postCallReview && postCallReview.conversationId === preferredConversationId ? (
          <MeetingPostCallReviewCard
            review={postCallReview}
            onContinue={async (confirmed) => {
              const remainingIds = new Set(confirmed.followUps.map((item) => item.id))
              const dismissed = postCallReview.followUps.filter(
                (item) => !remainingIds.has(item.id),
              )
              await Promise.all([
                updateSpaceItem(confirmed.spaceId, confirmed.meetingItemId, {
                  custom_data: {
                    meeting_summary: confirmed.summary,
                    client_campaign: confirmed.clientCampaign,
                    attendee_labels: confirmed.attendees
                      .split(',')
                      .map((label) => label.trim())
                      .filter(Boolean),
                    slack_follow_up_confirm: {
                      draft_message: confirmed.followUpMessage,
                      review_summary: confirmed.summary,
                    },
                  },
                }),
                ...dismissed.map((item) =>
                  updateMeetingActionStatus(
                    confirmed.spaceId,
                    confirmed.meetingItemId,
                    item.id,
                    'dismissed',
                  ),
                ),
              ])
              clearPostCallReview()
              useGlobalChatStore.getState().seedComposer({
                content: buildMeetingFollowUpTaskReviewPrompt(confirmed),
                conversationId: confirmed.conversationId,
                workContext: { surface: 'spaces', spaceId: meetingContext?.spaceId },
              })
            }}
          />
        ) : null}
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
