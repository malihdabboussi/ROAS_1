'use client'

import { useMemo } from 'react'
import { Hash, MessageSquare } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { ChannelChatContainer, useChannels } from '@/features/channels'
import { buildSpaceChannelViewPatch } from '../../lib/space-channel-view-patch'
import type { ViewDef } from '../../types/space-schema'
import { SpaceChannelsSidebar } from './SpaceChannelsSidebar'

function ChannelsEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass left-spacing-8 top-spacing-12 w-spacing-28 gap-spacing-2 p-spacing-2 absolute flex h-32 -rotate-6 flex-col opacity-40 shadow-lg">
        {[1, 2, 3].map((i) => (
          <div key={i} className="gap-spacing-2 flex items-start">
            <div className="h-spacing-4 w-spacing-4 border-border bg-secondary shrink-0 rounded-full border" />
            <div className="space-y-spacing-1 min-w-0 flex-1">
              <div className="h-spacing-1 bg-muted-foreground w-2/5 rounded-full opacity-20" />
              <div className="h-spacing-1 bg-muted-foreground opacity-12 w-full rounded-full" />
              <div className="h-spacing-1 bg-muted-foreground opacity-12 w-4/5 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-44 w-56 -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 gap-spacing-2 border-border bg-muted px-spacing-3 flex shrink-0 items-center border-b opacity-90">
          <Hash className="icon-xs text-muted-foreground shrink-0 opacity-45" />
          <div className="h-spacing-2 bg-muted-foreground min-w-0 flex-1 rounded-full opacity-20" />
          <MessageSquare className="icon-xs text-muted-foreground shrink-0 opacity-35" />
        </div>
        <div className="gap-spacing-3 p-spacing-3 flex min-h-0 flex-1 flex-col">
          <div className="gap-spacing-2 flex flex-col">
            <div className="ml-spacing-6 space-y-spacing-1 rounded-spacing-2 border-border bg-secondary px-spacing-2 py-spacing-2 max-w-[85%] border">
              <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-20" />
              <div className="h-spacing-1 bg-muted-foreground opacity-12 w-5/6 rounded-full" />
            </div>
            <div className="mr-spacing-4 space-y-spacing-1 rounded-spacing-2 border-primary/25 bg-primary/10 px-spacing-2 py-spacing-2 max-w-[78%] self-end border">
              <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-25" />
              <div className="h-spacing-1 bg-muted-foreground opacity-12 w-3/5 rounded-full" />
            </div>
            <div className="ml-spacing-6 space-y-spacing-1 rounded-spacing-2 border-border bg-secondary px-spacing-2 py-spacing-2 max-w-[80%] border">
              <div className="h-spacing-1 bg-muted-foreground w-11/12 rounded-full opacity-15" />
              <div className="h-spacing-1 bg-muted-foreground opacity-12 w-2/3 rounded-full" />
            </div>
          </div>
          <div className="gap-spacing-2 rounded-spacing-2 border-border bg-muted px-spacing-2 py-spacing-2 mt-auto flex items-center border opacity-90">
            <div className="h-spacing-2 bg-muted-foreground opacity-12 min-w-0 flex-1 rounded-full" />
            <div className="h-spacing-5 w-spacing-12 bg-primary shrink-0 rounded-full opacity-35" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChannelsIndexView({
  view,
  spaceId,
  campaignId,
  onViewPatch,
}: {
  view: ViewDef
  spaceId?: string | null
  campaignId?: string | null
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
}) {
  const { channels, loading } = useChannels()

  const config = view.channels_config ?? { channel_ids: [] }
  const channelIds = config.channel_ids ?? []
  const channelsById = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels],
  )
  const activeChannelId =
    config.active_channel_id && channelIds.includes(config.active_channel_id)
      ? config.active_channel_id
      : channelIds[0]

  const noChannels = channelIds.length === 0

  async function patchChannelsConfig(nextIds: string[], activeId?: string) {
    await onViewPatch(buildSpaceChannelViewPatch(view, nextIds, activeId))
  }

  async function selectChannel(channelId: string) {
    if (channelId === activeChannelId) return
    await patchChannelsConfig(channelIds, channelId)
  }

  async function removeChannel(channelId: string) {
    const nextIds = channelIds.filter((id) => id !== channelId)
    const nextActive = activeChannelId === channelId ? nextIds[0] : activeChannelId
    await patchChannelsConfig(nextIds, nextActive)
  }

  if (loading && noChannels) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <VibeyLoadingOrb text="Loading channels..." state="processing" size="lg" />
      </div>
    )
  }

  if (noChannels) {
    return (
      <div className="gap-spacing-6 px-spacing-8 pb-spacing-8 pt-spacing-2 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden text-center">
        <ChannelsEmptyMockup />
        <div className="space-y-spacing-1">
          <p className="title-h6 text-foreground">No channels yet</p>
          <p className="body-3 text-muted-foreground max-w-xs">
            Pin team, customer, and campaign chats with{' '}
            <span className="font-semibold">+ Channel</span> in the toolbar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="gap-spacing-2 px-spacing-4 pt-spacing-1-5 pb-spacing-3 flex min-h-0 flex-1 overflow-hidden">
      <SpaceChannelsSidebar
        channelIds={channelIds}
        channelsById={channelsById}
        activeChannelId={activeChannelId}
        spaceId={spaceId ?? null}
        onSelectChannel={(id) => void selectChannel(id)}
        onRemoveChannel={(id) => void removeChannel(id)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {activeChannelId && channelsById.has(activeChannelId) ? (
          <ChannelChatContainer
            channelId={activeChannelId}
            spaceId={spaceId ?? null}
            campaignId={campaignId ?? null}
            spaceToolbarLayout
            omitChatTrailingInset
          />
        ) : activeChannelId ? (
          <div className="flex h-full flex-1 items-center justify-center p-8 text-center">
            <div>
              <p className="body-2 text-foreground font-medium">Channel no longer available</p>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                Remove it from the sidebar or open customize.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-1 items-center justify-center p-8 text-center">
            <div>
              <p className="body-2 text-foreground font-medium">No channel selected</p>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                Choose a channel from the left.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
