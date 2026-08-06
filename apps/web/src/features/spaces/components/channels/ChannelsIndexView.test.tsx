import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ViewDef } from '../../types/space-schema'
import { ChannelsIndexView } from './ChannelsIndexView'

vi.mock('@/features/channels', () => ({
  ChannelChatContainer: () => <div>Channel chat</div>,
  useChannels: () => ({ channels: [{ id: 'channel-1', name: 'General' }], loading: false }),
}))

vi.mock('./SpaceChannelsSidebar', () => ({
  SpaceChannelsSidebar: () => <aside aria-label="Channels">Channel list</aside>,
}))

describe('ChannelsIndexView', () => {
  afterEach(() => cleanup())

  it('renders the channel rail and chat workspace together', () => {
    render(
      <ChannelsIndexView
        view={
          {
            id: 'channels',
            name: 'Channels',
            type: 'channels',
            channels_config: { channel_ids: ['channel-1'], active_channel_id: 'channel-1' },
          } as ViewDef
        }
        spaceId="space-1"
        campaignId="campaign-1"
        onViewPatch={vi.fn()}
      />,
    )

    expect(screen.getByText('Channel list')).toBeTruthy()
    expect(screen.getByText('Channel chat')).toBeTruthy()
  })
})
