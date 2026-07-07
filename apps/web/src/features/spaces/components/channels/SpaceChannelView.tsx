'use client'

import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { ChannelChatContainer, useChannels } from '@/features/channels'
import type { ViewDef } from '../../types/space-schema'

export function SpaceChannelView({
  view,
  spaceId,
  campaignId,
}: {
  view: ViewDef
  /** Forwarded into the channel API + agent runtime so artifacts auto-scope to this space/campaign. */
  spaceId?: string | null
  campaignId?: string | null
}) {
  const { channels, loading } = useChannels()
  const channelId = view.channel_config?.channel_id
  const channel = channelId ? channels.find((item) => item.id === channelId) : null

  if (!channelId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <p className="body-2 text-foreground font-medium">No channel selected</p>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            Pin a channel with <span className="font-semibold">+ Channel</span> in the toolbar.
          </p>
        </div>
      </div>
    )
  }

  if (loading && !channel) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <VibeyLoadingOrb text="Loading channel..." state="processing" size="lg" />
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <p className="body-2 text-foreground font-medium">Channel no longer available</p>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            Change the channel in view settings or remove this tab.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-spacing-4 pt-spacing-1-5 pb-spacing-3 flex min-h-0 flex-1 overflow-hidden">
      <ChannelChatContainer
        channelId={channelId}
        spaceId={spaceId ?? null}
        campaignId={campaignId ?? null}
        spaceToolbarLayout
        omitChatTrailingInset
      />
    </div>
  )
}
