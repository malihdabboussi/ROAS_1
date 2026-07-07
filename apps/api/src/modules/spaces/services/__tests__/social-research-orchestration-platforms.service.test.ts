import { describe, expect, it, vi } from 'vitest'
import { makeService } from './social-research-orchestration-test-helpers'

describe('SocialResearchOrchestrationService platform-specific flows', () => {
  it('syncSocialResearch use_existing counts youtube_research items', async () => {
    const { service, scrapeCreators } = makeService({
      space: {
        schema: {
          views: [
            {
              id: 'yt1',
              type: 'youtube_research',
              youtube_research_config: { tracked_accounts: [{ handle: 'techchannel' }] },
            },
          ],
        },
      },
      items: [
        {
          id: 'item-yt-1',
          custom_data: {
            _view_type: 'youtube_research',
            _platform: 'youtube',
            _handle: 'techchannel',
            media_id: 'dQw4w9WgXcQ',
            video_id: 'dQw4w9WgXcQ',
            outlier_score: 4,
            taken_at: new Date().toISOString(),
          },
        },
      ],
    })
    const result = await service.syncSocialResearch({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      platformSelector: 'youtube',
      mode: 'use_existing',
    })
    expect(scrapeCreators.fetchSocialPosts).not.toHaveBeenCalled()
    expect(result.synced_count).toBe(1)
    expect(result.existing_item_count).toBe(1)
    expect(result.platforms).toEqual(['youtube'])
    expect(result.handles).toEqual(['techchannel'])
  })

  it('syncSocialResearch resync stores youtube_research items with video_id', async () => {
    const { service, scrapeCreators, repo, media } = makeService({
      space: {
        schema: {
          views: [
            {
              id: 'yt1',
              type: 'youtube_research',
              youtube_research_config: { tracked_accounts: [{ handle: 'techchannel' }] },
            },
          ],
        },
      },
    })
    scrapeCreators.fetchSocialPosts.mockResolvedValue([
      {
        platform: 'youtube',
        media_id: 'dQw4w9WgXcQ',
        shortcode: 'dQw4w9WgXcQ',
        media_type: 'youtube_video',
        play_count: 1000,
        like_count: 50,
        comment_count: 10,
        thumbnail_url: 'https://example.com/thumb.jpg',
        video_url: null,
        taken_at: new Date().toISOString(),
        outlier_score: 2,
        caption: null,
      },
    ])
    scrapeCreators.fetchSocialProfile.mockResolvedValue({
      profile_pic_url: null,
      follower_count: 10_000,
      user_id: 'UC123',
      full_name: 'Tech Channel',
    })
    media.cacheSocialImage.mockResolvedValue({
      ok: false,
      cacheKey: 'yt/techchannel/dQw4w9WgXcQ/thumbnail',
    })
    const result = await service.syncSocialResearch({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      platformSelector: 'youtube',
      mode: 'resync_30d',
    })
    expect(scrapeCreators.fetchSocialPosts).toHaveBeenCalledWith(
      'youtube',
      'techchannel',
      'user-1',
      null,
    )
    expect(repo.createItem).toHaveBeenCalled()
    const itemPayload = vi.mocked(repo.createItem).mock.calls[0]?.[3] as
      | { custom_data?: Record<string, unknown> }
      | undefined
    expect(itemPayload?.custom_data).toMatchObject({
      _view_type: 'youtube_research',
      _platform: 'youtube',
      _handle: 'techchannel',
      video_id: 'dQw4w9WgXcQ',
      media_id: 'dQw4w9WgXcQ',
    })
    expect(result.created_count).toBe(1)
    expect(result.platforms).toEqual(['youtube'])
  })

  it('enrichSocialResearchItems fetches missing transcript for youtube', async () => {
    const { service, scrapeCreators, repo } = makeService({
      items: [
        {
          id: 'item-yt-1',
          custom_data: {
            _view_type: 'youtube_research',
            _platform: 'youtube',
            _handle: 'techchannel',
            media_id: 'dQw4w9WgXcQ',
            video_id: 'dQw4w9WgXcQ',
            shortcode: 'dQw4w9WgXcQ',
          },
        },
      ],
    })
    scrapeCreators.fetchSocialTranscript.mockResolvedValue('Intro line. Second line.')
    const result = await service.enrichSocialResearchItems({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      itemIds: ['item-yt-1'],
      enrichments: ['transcript', 'hook'],
    })
    expect(scrapeCreators.fetchSocialTranscript).toHaveBeenCalledWith(
      'youtube',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'user-1',
      null,
    )
    expect(repo.updateItem).toHaveBeenCalled()
    expect(result.enriched_item_ids).toEqual(['item-yt-1'])
  })

  it('syncSocialResearch use_existing counts twitter_research items', async () => {
    const { service, scrapeCreators } = makeService({
      space: {
        schema: {
          views: [
            {
              id: 'x1',
              type: 'twitter_research',
              twitter_research_config: { tracked_accounts: [{ handle: 'elonmusk' }] },
            },
          ],
        },
      },
      items: [
        {
          id: 'item-x-1',
          custom_data: {
            _view_type: 'twitter_research',
            _platform: 'twitter',
            _handle: 'elonmusk',
            media_id: '1234567890',
            tweet_id: '1234567890',
            outlier_score: 4,
            taken_at: new Date().toISOString(),
          },
        },
      ],
    })
    const result = await service.syncSocialResearch({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      platformSelector: 'twitter',
      mode: 'use_existing',
    })
    expect(scrapeCreators.fetchSocialPosts).not.toHaveBeenCalled()
    expect(result.synced_count).toBe(1)
    expect(result.existing_item_count).toBe(1)
    expect(result.platforms).toEqual(['twitter'])
    expect(result.handles).toEqual(['elonmusk'])
  })

  it('syncSocialResearch resync stores twitter_research items with tweet_id', async () => {
    const { service, scrapeCreators, repo, media } = makeService({
      space: {
        schema: {
          views: [
            {
              id: 'x1',
              type: 'twitter_research',
              twitter_research_config: { tracked_accounts: [{ handle: 'elonmusk' }] },
            },
          ],
        },
      },
    })
    scrapeCreators.fetchSocialPosts.mockResolvedValue([
      {
        platform: 'twitter',
        media_id: '1234567890',
        shortcode: '1234567890',
        media_type: 'tweet',
        play_count: 1000,
        like_count: 50,
        comment_count: 10,
        thumbnail_url: 'https://pbs.twimg.com/media/example.jpg',
        video_url: null,
        taken_at: new Date().toISOString(),
        outlier_score: 2,
        caption: 'Hello world',
      },
    ])
    scrapeCreators.fetchSocialProfile.mockResolvedValue({
      profile_pic_url: null,
      follower_count: 10_000,
      user_id: '44196397',
      full_name: 'Elon Musk',
    })
    media.cacheSocialImage.mockResolvedValue({
      ok: false,
      cacheKey: 'x/elonmusk/1234567890/thumbnail',
    })
    const result = await service.syncSocialResearch({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      platformSelector: 'twitter',
      mode: 'resync_30d',
    })
    expect(scrapeCreators.fetchSocialPosts).toHaveBeenCalledWith(
      'twitter',
      'elonmusk',
      'user-1',
      null,
    )
    expect(repo.createItem).toHaveBeenCalled()
    const itemPayload = vi.mocked(repo.createItem).mock.calls[0]?.[3] as
      | { custom_data?: Record<string, unknown> }
      | undefined
    expect(itemPayload?.custom_data).toMatchObject({
      _view_type: 'twitter_research',
      _platform: 'twitter',
      _handle: 'elonmusk',
      tweet_id: '1234567890',
      media_id: '1234567890',
    })
    expect(result.created_count).toBe(1)
    expect(result.platforms).toEqual(['twitter'])
  })

  it('enrichSocialResearchItems fetches missing transcript for twitter', async () => {
    const { service, scrapeCreators, repo } = makeService({
      items: [
        {
          id: 'item-x-1',
          custom_data: {
            _view_type: 'twitter_research',
            _platform: 'twitter',
            _handle: 'elonmusk',
            media_id: '1234567890',
            tweet_id: '1234567890',
            shortcode: '1234567890',
          },
        },
      ],
    })
    scrapeCreators.fetchSocialTranscript.mockResolvedValue('Intro line. Second line.')
    const result = await service.enrichSocialResearchItems({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      itemIds: ['item-x-1'],
      enrichments: ['transcript', 'hook'],
    })
    expect(scrapeCreators.fetchSocialTranscript).toHaveBeenCalledWith(
      'twitter',
      'https://x.com/elonmusk/status/1234567890',
      'user-1',
      null,
    )
    expect(repo.updateItem).toHaveBeenCalled()
    expect(result.enriched_item_ids).toEqual(['item-x-1'])
  })
})
