import { describe, expect, it, vi } from 'vitest'
import { makeService } from './social-research-orchestration-test-helpers'

describe('SocialResearchOrchestrationService core flows', () => {
  it('syncSocialResearch use_existing does not call ScrapeCreators', async () => {
    const { service, scrapeCreators } = makeService({
      items: [
        {
          id: 'item-1',
          custom_data: {
            _view_type: 'instagram_research',
            _platform: 'instagram',
            _handle: 'creator',
            media_id: 'm1',
            outlier_score: 3,
            taken_at: new Date().toISOString(),
          },
        },
      ],
    })
    const supabase = {} as never
    const result = await service.syncSocialResearch({
      supabase,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      platformSelector: 'instagram',
      mode: 'use_existing',
    })
    expect(scrapeCreators.fetchSocialPosts).not.toHaveBeenCalled()
    expect(result.synced_count).toBe(1)
    expect(result.existing_item_count).toBe(1)
    expect(result.created_count).toBe(0)
  })

  it('syncSocialResearch rejects spaces without social research views', async () => {
    const { service } = makeService({
      space: { schema: { views: [{ id: 'v1', type: 'kanban' }] } },
    })
    await expect(
      service.syncSocialResearch({
        supabase: {} as never,
        userId: 'user-1',
        orgId: null,
        spaceId: 'space-1',
        platformSelector: 'instagram',
        mode: 'use_existing',
      }),
    ).rejects.toThrow(/No social research views found/)
  })

  it('selectSocialOutliers filters by score, date, and limit', async () => {
    const old = new Date(Date.now() - 40 * 86_400_000).toISOString()
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString()
    const { service } = makeService({
      items: [
        {
          id: 'old',
          custom_data: {
            _view_type: 'instagram_research',
            _platform: 'instagram',
            _handle: 'a',
            media_id: '1',
            shortcode: '1',
            outlier_score: 10,
            play_count: 100,
            taken_at: old,
          },
        },
        {
          id: 'low',
          custom_data: {
            _view_type: 'instagram_research',
            _platform: 'instagram',
            _handle: 'a',
            media_id: '2',
            shortcode: '2',
            outlier_score: 1,
            play_count: 50,
            taken_at: recent,
          },
        },
        {
          id: 'top',
          custom_data: {
            _view_type: 'instagram_research',
            _handle: 'a',
            media_id: '3',
            shortcode: '3',
            outlier_score: 8,
            play_count: 200,
            taken_at: recent,
          },
        },
        {
          id: 'missing-date',
          custom_data: {
            _view_type: 'instagram_research',
            _platform: 'instagram',
            _handle: 'a',
            media_id: '4',
            shortcode: '4',
            outlier_score: 12,
            play_count: 400,
          },
        },
      ],
    })
    const result = await service.selectSocialOutliers({
      supabase: {} as never,
      spaceId: 'space-1',
      platformSelector: 'instagram',
      minScore: 2,
      limit: 1,
      sinceDays: 30,
    })
    expect(result.selected_item_ids).toEqual(['top'])
    expect(result.outlier_count).toBe(1)
    expect(result.digest).toContain('Top social research outliers')
  })

  it('enrichSocialResearchItems does not count unavailable enrichments', async () => {
    const { service, scrapeCreators, transcriptFallback, repo } = makeService({
      items: [
        {
          id: 'item-1',
          custom_data: {
            _view_type: 'instagram_research',
            _handle: 'creator',
            media_id: 'm1',
            shortcode: 'sc1',
            post_url: 'https://www.instagram.com/reel/sc1/',
          },
        },
      ],
    })
    scrapeCreators.fetchSocialTranscript.mockResolvedValue(null)
    transcriptFallback.fetchTranscriptViaAgent.mockResolvedValue(null)
    const result = await service.enrichSocialResearchItems({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      itemIds: ['item-1'],
      enrichments: ['transcript', 'hook'],
    })
    expect(transcriptFallback.fetchTranscriptViaAgent).toHaveBeenCalled()
    expect(repo.updateItem).not.toHaveBeenCalled()
    expect(result.enriched_count).toBe(0)
    expect(result.enriched_item_ids).toEqual([])
  })

  it('enrichSocialResearchItems reuses transcript and writes hook', async () => {
    const { service, scrapeCreators } = makeService({
      items: [
        {
          id: 'item-1',
          custom_data: {
            _view_type: 'instagram_research',
            _platform: 'instagram',
            _handle: 'creator',
            media_id: 'm1',
            shortcode: 'sc1',
            transcript: 'Hello world. This is a hook sentence.',
          },
        },
      ],
    })
    const result = await service.enrichSocialResearchItems({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      itemIds: ['item-1'],
      enrichments: ['hook'],
    })
    expect(scrapeCreators.fetchSocialTranscript).not.toHaveBeenCalled()
    expect(result.enriched_count).toBe(1)
    expect(result.outliers[0]?.hook).toBeTruthy()
  })

  it('enrichSocialResearchItems fetches missing transcript', async () => {
    const { service, scrapeCreators, repo } = makeService({
      items: [
        {
          id: 'item-1',
          custom_data: {
            _view_type: 'tiktok_research',
            _platform: 'tiktok',
            _handle: 'creator',
            media_id: 'm1',
            shortcode: 'm1',
          },
        },
      ],
    })
    scrapeCreators.fetchSocialTranscript.mockResolvedValue('Line one. Line two.')
    const result = await service.enrichSocialResearchItems({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      itemIds: ['item-1'],
      enrichments: ['transcript', 'hook'],
    })
    expect(scrapeCreators.fetchSocialTranscript).toHaveBeenCalled()
    expect(repo.updateItem).toHaveBeenCalled()
    expect(result.enriched_item_ids).toEqual(['item-1'])
  })

  it('enrichSocialResearchItems falls back for missing instagram transcript', async () => {
    const { service, scrapeCreators, transcriptFallback, repo } = makeService({
      items: [
        {
          id: 'item-1',
          custom_data: {
            _view_type: 'instagram_research',
            _platform: 'instagram',
            _handle: 'creator',
            media_id: 'm1',
            shortcode: 'sc1',
          },
        },
      ],
    })
    scrapeCreators.fetchSocialTranscript.mockResolvedValue(null)
    transcriptFallback.fetchTranscriptViaAgent.mockResolvedValue('Fallback line. Second line.')
    const result = await service.enrichSocialResearchItems({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      itemIds: ['item-1'],
      enrichments: ['transcript', 'hook'],
    })
    expect(scrapeCreators.fetchSocialTranscript).toHaveBeenCalledWith(
      'instagram',
      'https://www.instagram.com/reel/sc1/',
      'user-1',
      null,
    )
    expect(transcriptFallback.fetchTranscriptViaAgent).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: null,
      platform: 'instagram',
      url: 'https://www.instagram.com/reel/sc1/',
    })
    expect(repo.updateItem).toHaveBeenCalled()
    expect(result.enriched_item_ids).toEqual(['item-1'])
  })

  it('analyzeSocialPost falls back for missing instagram transcript', async () => {
    const { service, scrapeCreators, transcriptFallback, repo } = makeService({
      items: [
        {
          id: 'item-1',
          custom_data: {
            _view_type: 'instagram_research',
            _platform: 'instagram',
            _handle: 'creator',
            media_id: 'm1',
            shortcode: 'sc1',
            post_url: 'https://www.instagram.com/reel/sc1/',
          },
        },
      ],
    })
    scrapeCreators.fetchSocialPostInfo.mockResolvedValue({
      caption: null,
      like_count: null,
      comment_count: null,
      play_count: null,
      video_duration: null,
      owner_username: null,
      owner_full_name: null,
      owner_follower_count: null,
      owner_is_verified: false,
      owner_profile_pic: null,
      owner_post_count: null,
      audio_name: null,
      audio_artist: null,
      is_original_audio: false,
      is_paid_partnership: false,
      tagged_users: [],
      has_audio: true,
    })
    scrapeCreators.fetchSocialTranscript.mockResolvedValue(null)
    transcriptFallback.fetchTranscriptViaAgent.mockResolvedValue('Fallback line. Second line.')
    const result = await service.analyzeSocialPost({
      supabase: {} as never,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      platform: 'instagram',
      itemId: 'item-1',
      shortcodeOrId: 'sc1',
      handle: 'creator',
    })
    expect(transcriptFallback.fetchTranscriptViaAgent).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: null,
      platform: 'instagram',
      url: 'https://www.instagram.com/reel/sc1/',
    })
    expect(repo.updateItem).toHaveBeenCalled()
    const updatePayload = vi.mocked(repo.updateItem).mock.calls[0]?.[4] as
      | { custom_data?: Record<string, unknown> }
      | undefined
    expect(updatePayload?.custom_data?.transcript).toBe('Fallback line. Second line.')
    expect(result.transcript).toBe('Fallback line. Second line.')
    expect(result.hook).toBe('Fallback line. Second line.')
  })

  it('rejects non-social item ids', async () => {
    const { service } = makeService({
      items: [
        {
          id: 'item-1',
          custom_data: { _view_type: 'kanban', title: 'Task' },
        },
      ],
    })
    await expect(
      service.enrichSocialResearchItems({
        supabase: {} as never,
        userId: 'user-1',
        orgId: null,
        spaceId: 'space-1',
        itemIds: ['item-1'],
        enrichments: ['caption'],
      }),
    ).rejects.toThrow(/not a social research item/)
  })
})
