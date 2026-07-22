import { describe, expect, it, vi } from 'vitest'
import { ArtifactResearchService } from './artifact-research.service'

const service = new ArtifactResearchService()

function makeTarget(responses: unknown[]) {
  return {
    mainApiCall: vi.fn(async () => {
      if (responses.length === 0) throw new Error('unexpected call')
      return responses.shift()
    }),
    logger: { error: vi.fn() },
    resolveMissionContext: vi.fn(async () => ({ missionId: 'mission-1' })),
    resolveUserId: vi.fn(() => 'user-1'),
  }
}

describe('ArtifactResearchService', () => {
  it('runs social topic search, saves the search snapshot, and optionally saves top items', async () => {
    const target = makeTarget([
      { success: true, items: [{ media_id: 'm1' }, { media_id: 'm2' }], next_cursor: 'cursor-2' },
      { success: true, search: { id: 'search-1', result_count: 2 } },
      { success: true, created_count: 1, skipped_count: 0, item_ids: ['item-1'] },
    ])

    const result = await service.getHandlers(target).run_social_research_search(
      {
        space_id: 'space-1',
        platform: 'instagram',
        query: 'pilates studio hooks',
        save_top_n: 1,
      },
      'session-1',
    )

    expect(result).toMatchObject({
      success: true,
      saved_search_created: true,
      result_count: 2,
      saved_search: { id: 'search-1' },
      space_refresh: { space_id: 'space-1', view_types: ['instagram_research'] },
    })
    expect(target.mainApiCall).toHaveBeenNthCalledWith(
      1,
      'POST',
      '/api/spaces/space-1/social-research/instagram/topic-search',
      'session-1',
      { query: 'pilates studio hooks' },
    )
    expect(target.mainApiCall).toHaveBeenNthCalledWith(
      2,
      'POST',
      '/api/spaces/space-1/social-research/topic-searches',
      'session-1',
      expect.objectContaining({
        platform: 'instagram',
        query: 'pilates studio hooks',
        items: [{ media_id: 'm1' }, { media_id: 'm2' }],
        next_cursor: 'cursor-2',
      }),
    )
    expect(target.mainApiCall).toHaveBeenNthCalledWith(
      3,
      'POST',
      '/api/spaces/space-1/social-research/instagram/topic-search/save',
      'session-1',
      { query: 'pilates studio hooks', items: [{ media_id: 'm1' }] },
    )
  })

  it('does not create a social saved search when the provider returns no items', async () => {
    const target = makeTarget([{ success: true, items: [], next_cursor: null }])

    const result = await service
      .getHandlers(target)
      .run_social_research_search(
        { space_id: 'space-1', platform: 'youtube', query: 'launch strategy' },
        'session-1',
      )

    expect(result).toMatchObject({
      success: true,
      saved_search_created: false,
      saved_search: null,
      result_count: 0,
    })
    expect(target.mainApiCall).toHaveBeenCalledTimes(1)
  })

  it('runs ads search, saves the search snapshot, and optionally saves top ads', async () => {
    const missionSession = 'agent:gateway:mission:blaze:user-1:mission-1'
    const target = makeTarget([
      { success: true, items: [{ ad_id: 'a1' }, { ad_id: 'a2' }], next_page_token: 'next-2' },
      { success: true, search: { id: 'ad-search-1', result_count: 2 } },
      { success: true, created_count: 1, skipped_count: 0, item_ids: ['item-1'] },
    ])

    const result = await service.getHandlers(target).run_ads_research_search(
      {
        space_id: 'space-1',
        platform: 'meta',
        kind: 'topic',
        query: 'fitness coaching',
        save_top_n: 1,
      },
      missionSession,
    )

    expect(result).toMatchObject({
      success: true,
      saved_search_created: true,
      result_count: 2,
      saved_search: { id: 'ad-search-1' },
      space_refresh: { space_id: 'space-1', view_types: ['ads_research'] },
    })
    expect(target.mainApiCall).toHaveBeenNthCalledWith(
      1,
      'POST',
      '/api/spaces/space-1/ads-research/meta/search',
      missionSession,
      expect.objectContaining({ kind: 'topic', query: 'fitness coaching' }),
    )
    expect(target.mainApiCall).toHaveBeenNthCalledWith(
      2,
      'POST',
      '/api/spaces/space-1/ads-research/searches',
      missionSession,
      expect.objectContaining({
        mission_id: 'mission-1',
        platform: 'meta',
        kind: 'topic',
        query: 'fitness coaching',
        items: [{ ad_id: 'a1' }, { ad_id: 'a2' }],
        next_page_token: 'next-2',
      }),
    )
    expect(target.mainApiCall).toHaveBeenNthCalledWith(
      3,
      'POST',
      '/api/spaces/space-1/ads-research/meta/save',
      missionSession,
      { query: 'fitness coaching', items: [{ ad_id: 'a1' }] },
    )
  })

  it('links ads research snapshots when the action runs from a mission subtask session', async () => {
    const subtaskSession = 'agent:gateway:subtask:blaze:user-1:11111111-1111-1111-1111-111111111111'
    const target = makeTarget([
      { success: true, items: [{ ad_id: 'a1' }], next_page_token: null },
      { success: true, search: { id: 'ad-search-1', result_count: 1 } },
    ])

    await service.getHandlers(target).run_ads_research_search(
      {
        space_id: 'space-1',
        platform: 'meta',
        kind: 'topic',
        query: 'insurance coaching',
      },
      subtaskSession,
    )

    expect(target.resolveMissionContext).toHaveBeenCalledWith(subtaskSession, 'user-1')
    expect(target.mainApiCall).toHaveBeenNthCalledWith(
      2,
      'POST',
      '/api/spaces/space-1/ads-research/searches',
      subtaskSession,
      expect.objectContaining({ mission_id: 'mission-1' }),
    )
  })

  it('rejects unsupported ads search combinations before calling the API', async () => {
    const target = makeTarget([])

    await expect(
      service
        .getHandlers(target)
        .run_ads_research_search(
          { space_id: 'space-1', platform: 'google', kind: 'topic', query: 'shoes' },
          'session-1',
        ),
    ).resolves.toMatchObject({
      success: false,
      error: 'Google ads research supports brand searches only',
    })
    await expect(
      service
        .getHandlers(target)
        .run_ads_research_search(
          { space_id: 'space-1', platform: 'meta', kind: 'brand', query: 'Nike' },
          'session-1',
        ),
    ).resolves.toMatchObject({
      success: false,
      error: 'Brand searches require an advertiser object',
    })
    expect(target.mainApiCall).not.toHaveBeenCalled()
  })

  it('searches ads advertisers with an encoded query', async () => {
    const target = makeTarget([{ success: true, advertisers: [{ id: 'adv-1', name: 'Nike' }] }])

    const result = await service
      .getHandlers(target)
      .search_ads_research_advertisers(
        { space_id: 'space-1', platform: 'google', query: 'Nike Running' },
        'session-1',
      )

    expect(result).toMatchObject({
      success: true,
      advertisers: [{ id: 'adv-1', name: 'Nike' }],
    })
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'GET',
      '/api/spaces/space-1/ads-research/google/advertisers?q=Nike+Running',
      'session-1',
    )
  })
})
