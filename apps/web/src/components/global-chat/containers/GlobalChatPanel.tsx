'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { SpaceVibeyChatPanel } from '@/features/spaces/components/chat/SpaceVibeyChatPanel'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { ChatSurfaceRecommendation } from '../components/ChatSurfaceRecommendation'
import { useGlobalChatStore } from '../store/use-global-chat-store'

export function GlobalChatPanel() {
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
    <div className="flex h-full min-h-0 flex-col">
      <ChatSurfaceRecommendation />
      <div className="min-h-0 flex-1">
        <SpaceVibeyChatPanel
          key={panelKey}
          spaceId={spaceId}
          campaignId={spaceId ? (workContext.campaignId ?? activeSpace?.campaign_id ?? null) : null}
          campaignName={isSpacesRoute ? (activeSpace?.title ?? null) : null}
          channelContext={
            isChannelRoute && channelId
              ? {
                  channelId,
                  channelName: workContext.channelName ?? 'Channel',
                  awarenessContext: workContext.channelAwarenessContext ?? '',
                }
              : undefined
          }
          onCollapseChat={() => setCollapsed(true)}
        />
      </div>
    </div>
  )
}
