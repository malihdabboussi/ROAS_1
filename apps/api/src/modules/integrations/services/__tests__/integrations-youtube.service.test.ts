import { describe, expect, it } from 'vitest'
import {
  composioYoutubeToolError,
  extractYoutubeChannelItems,
  parseYoutubeChannelsFromPlaylistsResponse,
  parseYoutubeChannelsResponse,
} from '../integrations-youtube.service'

describe('parseYoutubeChannelsResponse', () => {
  it('parses items from Composio data.items', () => {
    const channels = parseYoutubeChannelsResponse({
      successful: true,
      data: {
        items: [
          {
            id: 'UCtestchannel00000000001',
            snippet: { title: 'My Channel', customUrl: '@mychannel' },
          },
        ],
      },
    })
    expect(channels).toHaveLength(1)
    expect(channels[0]?.id).toBe('UCtestchannel00000000001')
    expect(channels[0]?.name).toBe('My Channel')
    expect(channels[0]?.handle).toBe('@mychannel')
  })

  it('parses items from data.response_dict.items', () => {
    const items = extractYoutubeChannelItems({
      successful: true,
      data: {
        response_dict: {
          items: [{ id: 'UCabc1234567890123456789', snippet: { title: 'Dict Channel' } }],
        },
      },
    })
    expect(items).toHaveLength(1)
    expect(
      parseYoutubeChannelsResponse({
        successful: true,
        data: {
          response_dict: {
            items: [{ id: 'UCabc1234567890123456789', snippet: { title: 'Dict Channel' } }],
          },
        },
      })[0]?.name,
    ).toBe('Dict Channel')
  })

  it('reads composio error when successful is false', () => {
    expect(
      composioYoutubeToolError({
        successful: false,
        error: 'OAuth scope missing',
      }),
    ).toBe('OAuth scope missing')
  })

  it('parses authenticated channel from user playlist snippets', () => {
    const channels = parseYoutubeChannelsFromPlaylistsResponse({
      successful: true,
      data: {
        items: [
          {
            id: 'playlist-1',
            snippet: {
              title: 'Uploads',
              channelId: 'UCplaylistowner000000000001',
              channelTitle: 'Playlist Owner',
            },
          },
        ],
      },
    })
    expect(channels).toHaveLength(1)
    expect(channels[0]?.id).toBe('UCplaylistowner000000000001')
    expect(channels[0]?.name).toBe('Playlist Owner')
  })
})
