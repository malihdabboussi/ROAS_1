import { describe, expect, it } from 'vitest'
import { resolveGlobalChatPanelHost } from './global-chat-panel-host'

describe('resolveGlobalChatPanelHost', () => {
  it('keys the panel by attached space while context is on spaces', () => {
    expect(
      resolveGlobalChatPanelHost({
        isChannelRoute: false,
        channelId: null,
        isSpacesRoute: false,
        activeSpaceId: null,
        activeSpaceCampaignId: null,
        workContext: { surface: 'spaces', spaceId: 'space-1', campaignId: 'camp-1' },
        sticky: null,
      }),
    ).toEqual({
      panelKey: 'space:space-1:camp-1',
      spaceId: 'space-1',
      campaignId: 'camp-1',
    })
  })

  it('keeps the sticky space host when the user detaches to general', () => {
    const sticky = {
      panelKey: 'space:space-1:camp-1',
      spaceId: 'space-1',
      campaignId: 'camp-1',
    }
    expect(
      resolveGlobalChatPanelHost({
        isChannelRoute: false,
        channelId: null,
        isSpacesRoute: false,
        activeSpaceId: null,
        activeSpaceCampaignId: null,
        workContext: { surface: 'general' },
        sticky,
      }),
    ).toEqual(sticky)
  })

  it('uses a stable general key when there is no sticky space host', () => {
    expect(
      resolveGlobalChatPanelHost({
        isChannelRoute: false,
        channelId: null,
        isSpacesRoute: false,
        activeSpaceId: null,
        activeSpaceCampaignId: null,
        workContext: { surface: 'brain' },
        sticky: null,
      }).panelKey,
    ).toBe('general')
  })
})
