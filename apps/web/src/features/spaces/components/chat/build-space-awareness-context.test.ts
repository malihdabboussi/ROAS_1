import { describe, expect, it } from 'vitest'
import {
  buildSpaceAwarenessContext,
  resolveChatSendAwarenessContext,
} from './build-space-awareness-context'

describe('resolveChatSendAwarenessContext', () => {
  it('sends a Home-chat Connections location into space awareness', () => {
    expect(
      resolveChatSendAwarenessContext({
        isChannelScope: false,
        chatSurface: 'general',
        campaignId: 'campaign-1',
        spaceId: 'space-1',
        connectedLocationLabel: 'Master Your Kraft General',
        scopeMatchesVisibleSpace: false,
      }),
    ).toBe(
      buildSpaceAwarenessContext({
        campaignName: 'Master Your Kraft General',
      }),
    )
  })

  it('skips awareness on Home chat when nothing is connected', () => {
    expect(
      resolveChatSendAwarenessContext({
        isChannelScope: false,
        chatSurface: 'general',
        campaignId: null,
        spaceId: null,
        connectedLocationLabel: 'General',
        scopeMatchesVisibleSpace: false,
      }),
    ).toBe('')
  })

  it('carries the open mission on Home chat even with nothing connected', () => {
    const context = resolveChatSendAwarenessContext({
      isChannelScope: false,
      chatSurface: 'general',
      campaignId: null,
      spaceId: null,
      connectedLocationLabel: 'General',
      scopeMatchesVisibleSpace: false,
      focusedMission: { id: 'mission-1', title: 'Claude Club Strategy', status: 'planning' },
    })
    expect(context).toContain('Open mission: Claude Club Strategy')
    expect(context).toContain('id: mission-1')
    expect(context).toContain('status: planning')
  })

  it('appends the open mission after the space context', () => {
    const context = resolveChatSendAwarenessContext({
      isChannelScope: false,
      chatSurface: 'spaces',
      campaignId: 'campaign-1',
      spaceId: 'space-1',
      connectedLocationLabel: 'Master Your Kraft General',
      scopeMatchesVisibleSpace: true,
      campaignName: 'Visible campaign',
      focusedMission: { id: 'mission-1', title: 'Claude Club Strategy', status: 'planning' },
    })
    expect(context).toContain('Campaign: Visible campaign')
    expect(context).toContain('Open mission: Claude Club Strategy')
  })

  it('uses the visible Space campaign when the chat is already on that Space', () => {
    expect(
      resolveChatSendAwarenessContext({
        isChannelScope: false,
        chatSurface: 'spaces',
        campaignId: 'campaign-1',
        spaceId: 'space-1',
        connectedLocationLabel: 'Master Your Kraft General',
        scopeMatchesVisibleSpace: true,
        campaignName: 'Visible campaign',
        activeViewName: 'Overview',
        activeViewType: 'overview',
      }),
    ).toContain('Campaign: Visible campaign')
  })
})
