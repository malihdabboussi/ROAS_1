'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { SpaceVibeyChatPanel } from '@/features/spaces/components/chat/SpaceVibeyChatPanel'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { ChatCampaignBrainNudge } from '../components/ChatCampaignBrainNudge'
import { ChatSurfaceRecommendation } from '../components/ChatSurfaceRecommendation'
import { GlobalChatComposerFooter } from '../components/GlobalChatComposerFooter'
import { QuickMissionsHubHost } from '../components/QuickMissionsHubHost'
import { useGlobalChatStore } from '../store/use-global-chat-store'

export function GlobalChatPanel({
  shellSidebarChrome = false,
  onCollapseChat,
  presentation = 'compact',
}: {
  shellSidebarChrome?: boolean
  onCollapseChat?: () => void
  presentation?: 'full' | 'compact'
} = {}) {
  const pathname = usePathname() ?? ''
  const workContext = useGlobalChatStore((s) => s.workContext)
  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpace = useMemo(
    () => spaces.find((space) => space.id === activeSpaceId) ?? null,
    [activeSpaceId, spaces],
  )

  const channelRouteMatch = pathname.match(/^\/home\/channels\/([^/]+)/)
  const channelId = channelRouteMatch?.[1] ?? workContext.channelId ?? null
  const isChannelRoute = Boolean(channelId && pathname.startsWith('/home/channels/'))
  const isSpacesRoute = pathname.startsWith('/spaces')
  const spaceId = isSpacesRoute
    ? (workContext.spaceId ?? activeSpaceId ?? undefined)
    : workContext.surface === 'spaces' && workContext.spaceId
      ? workContext.spaceId
      : undefined

  const panelKey = isChannelRoute
    ? `channel:${channelId}`
    : spaceId
      ? `space:${spaceId}:${workContext.campaignId ?? activeSpace?.campaign_id ?? 'personal'}`
      : `general:${workContext.surface}`

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ChatSurfaceRecommendation />
      <ChatCampaignBrainNudge />
      {/*
        Bound height for SpaceVibeyChatPanel: without overflow-hidden + flex column here,
        the thread spacer can grow the panel past the rail and clip the composer off-screen.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SpaceVibeyChatPanel
          key={panelKey}
          chatSurface={workContext.surface}
          spaceId={spaceId}
          campaignId={spaceId ? (workContext.campaignId ?? activeSpace?.campaign_id ?? null) : null}
          campaignName={isSpacesRoute ? (activeSpace?.title ?? null) : null}
          brainContext={
            workContext.surface === 'brain' && workContext.brainAwarenessContext
              ? {
                  brainId: workContext.brainId ?? null,
                  scopeLabel: workContext.brainScopeLabel ?? 'Brain',
                  awarenessContext: workContext.brainAwarenessContext,
                }
              : undefined
          }
          teamOpsContext={
            workContext.surface === 'team' && workContext.teamOpsAwarenessContext
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
          composerContextSlot={<GlobalChatComposerFooter />}
          onCollapseChat={onCollapseChat ?? (() => setCollapsed(true))}
        />
      </div>
      <QuickMissionsHubHost />
    </div>
  )
}
