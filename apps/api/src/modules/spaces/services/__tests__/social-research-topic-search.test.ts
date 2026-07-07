import { describe, expect, it, vi } from 'vitest'
import type { CreditsService } from '../../../billing/services/credits.service'
import type { ScrapeCreatorsApiService } from '../../../integrations/scrapecreators/services/scrapecreators-api.service'
import { SocialResearchScrapeCreatorsService } from '../social-research-scrapecreators.service'
import { SocialResearchTopicSearchSnapshotsService } from '../social-research-topic-search-snapshots.service'
import { SocialResearchTopicSearchService } from '../social-research-topic-search.service'
import { medianPlayCount } from '../social-research-utils'

// Trimmed real responses captured live from the ScrapeCreators API on 2026-06-11.
const YT_SEARCH_FIXTURE = {
  success: true,
  videos: [
    {
      type: 'video',
      id: 'mDWUpuumAuo',
      url: 'https://www.youtube.com/watch?v=mDWUpuumAuo',
      title: '9 Minute Training To Destroy Any Sales Objection',
      thumbnail: 'https://i.ytimg.com/vi/mDWUpuumAuo/hq720.jpg',
      channel: {
        id: 'UCQ5mWx_XYGRbpcV8zjGhorg',
        title: 'Jeremy Miner',
        handle: 'JeremyMiner',
        thumbnail: 'https://yt3.ggpht.com/avatar.jpg',
      },
      viewCountInt: 211707,
      publishedTime: '2025-06-11T08:27:44.336Z',
      lengthSeconds: 540,
    },
    {
      type: 'video',
      id: 'hzjIigX8nHQ',
      url: 'https://www.youtube.com/watch?v=hzjIigX8nHQ',
      title: '7 Most Common Sales Objections (And How To Overcome Them)',
      thumbnail: 'https://i.ytimg.com/vi/hzjIigX8nHQ/hq720.jpg',
      channel: {
        id: 'UC3bLxUg5G7D8ImDI9V_f2qg',
        title: 'Founder-Led Revenue Growth',
        // Some responses prefix the handle with `channel/` — mapper must normalize.
        handle: 'channel/UC3bLxUg5G7D8ImDI9V_f2qg',
        thumbnail: 'https://yt3.ggpht.com/avatar2.jpg',
      },
      viewCountInt: 330097,
      publishedTime: '2020-06-11T08:27:44.336Z',
      lengthSeconds: 824,
    },
  ],
  continuationToken: 'NEXT_PAGE_TOKEN',
}

const IG_SEARCH_FIXTURE = {
  success: true,
  reels: [
    {
      id: '3849183797447354955',
      shortcode: 'DVrDEUaCepL',
      caption: 'This is probably the MOST common objection you’ll hear in sales…',
      video_play_count: 59602,
      video_view_count: 17926,
      like_count: 1730,
      comment_count: 53,
      thumbnail_src: 'https://scontent.cdninstagram.com/thumb.jpg',
      url: 'https://www.instagram.com/reel/DVrDEUaCepL/',
      taken_at: '2026-03-09T17:55:25.000Z',
      owner: {
        username: 'jeremyleeminer',
        full_name: 'Jeremy Miner',
        follower_count: 1398718,
      },
    },
  ],
}

const TT_SEARCH_FIXTURE = {
  success: true,
  search_item_list: [
    {
      aweme_info: {
        aweme_id: '7639580496615312670',
        desc: 'I sat down with one of my students and after using this framework she PIFd',
        create_time: 1778728467,
        statistics: { play_count: 71300, digg_count: 4137, comment_count: 45 },
        author: { unique_id: 'sellingseleste', nickname: 'Alexis Mai', follower_count: 41933 },
        video: { cover: { url_list: ['https://p19.tiktokcdn-us.com/cover.jpeg'] } },
      },
    },
  ],
  cursor: 30,
  has_more: 1,
}

function makeService(body: unknown, capture?: { path?: string; query?: Record<string, string> }) {
  const api = {
    forwardGet: vi.fn(async (path: string, query: Record<string, string>) => {
      if (capture) {
        capture.path = path
        capture.query = query
      }
      return { status: 200, body }
    }),
  } as unknown as ScrapeCreatorsApiService
  const credits = {
    processDirectTextUsage: vi.fn(async () => undefined),
  } as unknown as CreditsService
  return new SocialResearchScrapeCreatorsService(api, credits)
}

describe('searchTopicPosts', () => {
  it('maps YouTube search results and normalizes channel handle variants', async () => {
    const service = makeService(YT_SEARCH_FIXTURE)
    const page = await service.searchTopicPosts('youtube', 'sales objections', 'user-1')

    expect(page.items).toHaveLength(2)
    expect(page.next_cursor).toBe('NEXT_PAGE_TOKEN')

    const first = page.items[0]!
    expect(first.media_id).toBe('mDWUpuumAuo')
    expect(first.play_count).toBe(211707)
    expect(first.caption).toBe('9 Minute Training To Destroy Any Sales Objection')
    expect(first.creator).toEqual({
      platform: 'youtube',
      handle: 'JeremyMiner',
      channel_id: 'UCQ5mWx_XYGRbpcV8zjGhorg',
    })
    expect(first.outlier_score).toBeNull()

    // `channel/UC...` handle form is stripped to the bare id.
    expect(page.items[1]!.creator.handle).toBe('UC3bLxUg5G7D8ImDI9V_f2qg')
  })

  it('maps Instagram reels search via the v2 endpoint with owner identity', async () => {
    const capture: { path?: string; query?: Record<string, string> } = {}
    const service = makeService(IG_SEARCH_FIXTURE, capture)
    const page = await service.searchTopicPosts('instagram', 'sales objections', 'user-1')

    expect(capture.path).toBe('/v2/instagram/reels/search')
    // Page-number cursor synthesized client-side: first call is page 1 -> next is 2.
    expect(page.next_cursor).toBe('2')

    const reel = page.items[0]!
    expect(reel.media_id).toBe('3849183797447354955')
    expect(reel.shortcode).toBe('DVrDEUaCepL')
    expect(reel.play_count).toBe(59602)
    expect(reel.post_url).toBe('https://www.instagram.com/reel/DVrDEUaCepL/')
    expect(reel.creator.handle).toBe('jeremyleeminer')
    expect(reel.creator_follower_count).toBe(1398718)
  })

  it('maps TikTok keyword search and sends the upstream `query` param', async () => {
    const capture: { path?: string; query?: Record<string, string> } = {}
    const service = makeService(TT_SEARCH_FIXTURE, capture)
    const page = await service.searchTopicPosts('tiktok', 'sales objections', 'user-1')

    expect(capture.path).toBe('/v1/tiktok/search/keyword')
    expect(capture.query).toEqual({ query: 'sales objections' })
    expect(page.next_cursor).toBe('30')

    const video = page.items[0]!
    expect(video.media_id).toBe('7639580496615312670')
    expect(video.play_count).toBe(71300)
    expect(video.creator.handle).toBe('sellingseleste')
    expect(video.post_url).toBe('https://www.tiktok.com/@sellingseleste/video/7639580496615312670')
    expect(video.thumbnail_url).toBe('https://p19.tiktokcdn-us.com/cover.jpeg')
  })

  it('rejects platforms without keyword search', async () => {
    const service = makeService({})
    await expect(service.searchTopicPosts('twitter', 'anything', 'user-1')).rejects.toThrow()
  })
})

describe('medianPlayCount', () => {
  it('computes odd, even, and empty medians', () => {
    expect(medianPlayCount([])).toBe(0)
    expect(medianPlayCount([{ play_count: 5 }])).toBe(5)
    expect(medianPlayCount([{ play_count: 1 }, { play_count: 9 }])).toBe(5)
    expect(
      medianPlayCount([{ play_count: 10 }, { play_count: 1000 }, { play_count: 150000 }]),
    ).toBe(1000)
  })
})

describe('SocialResearchTopicSearchService.createSavedSearch', () => {
  it('carries prior cached thumbnails and snapshots only new Instagram thumbnails', async () => {
    const updatePayloads: Array<Record<string, unknown>> = []
    const existingSearch = {
      id: 'search-1',
      title: 'Objections',
      results: [
        {
          media_id: 'existing-media',
          thumbnail_cached_url: 'https://storage.example/existing.jpg',
        },
      ],
    }
    const makeThenableQuery = (result: unknown) => {
      const query: Record<string, unknown> = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        ilike: vi.fn(() => query),
        limit: vi.fn(() => query),
        update: vi.fn((payload: Record<string, unknown>) => {
          updatePayloads.push(payload)
          return query
        }),
        single: vi.fn(() => Promise.resolve(result)),
        then: (resolve: (value: unknown) => void) => resolve(result),
      }
      return query
    }
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeThenableQuery({ data: [existingSearch], error: null }))
        .mockReturnValueOnce(
          makeThenableQuery({
            data: {
              id: 'search-1',
              platform: 'instagram',
              title: 'Objections',
              query: 'sales objections',
              filters: {},
              results: [],
              result_count: 2,
              next_cursor: null,
              created_at: 'now',
              last_run_at: 'now',
            },
            error: null,
          }),
        ),
    }
    const media = {
      cacheSocialImage: vi.fn(async () => ({ ok: true, url: 'https://storage.example/new.jpg' })),
    }
    const snapshots = new SocialResearchTopicSearchSnapshotsService(media as never)
    const service = new SocialResearchTopicSearchService(
      {} as never,
      {} as never,
      media as never,
      snapshots,
      undefined,
    )

    await service.createSavedSearch({
      supabase: supabase as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      platform: 'instagram',
      title: 'Objections',
      query: 'sales objections',
      filters: {},
      nextCursor: null,
      items: [
        {
          media_id: 'existing-media',
          shortcode: 'old',
          media_type: 'video',
          play_count: 10,
          like_count: 1,
          comment_count: 0,
          thumbnail_url: 'https://cdn.example/existing.jpg',
          video_url: null,
          taken_at: null,
          caption: 'Existing',
          post_url: 'https://instagram.com/reel/old',
          creator_title: 'Creator',
          creator_follower_count: null,
          baseline_median: null,
          outlier_score: null,
          creator: { platform: 'instagram', handle: 'creator' },
        },
        {
          media_id: 'new-media',
          shortcode: 'new',
          media_type: 'video',
          play_count: 20,
          like_count: 2,
          comment_count: 1,
          thumbnail_url: 'https://cdn.example/new.jpg',
          video_url: null,
          taken_at: null,
          caption: 'New',
          post_url: 'https://instagram.com/reel/new',
          creator_title: 'Creator',
          creator_follower_count: null,
          baseline_median: null,
          outlier_score: null,
          creator: { platform: 'instagram', handle: 'creator' },
        },
      ],
    })

    expect(media.cacheSocialImage).toHaveBeenCalledTimes(1)
    expect(updatePayloads[0]?.results).toEqual([
      expect.objectContaining({
        media_id: 'existing-media',
        thumbnail_cached_url: 'https://storage.example/existing.jpg',
      }),
      expect.objectContaining({
        media_id: 'new-media',
        thumbnail_cached_url: 'https://storage.example/new.jpg',
      }),
    ])
  })
})
