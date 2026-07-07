import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SocialInsightsService } from '../social-insights.service'

describe('SocialInsightsService LinkedIn company page', () => {
  const composio = { executeTool: vi.fn() } as never
  let service: SocialInsightsService

  beforeEach(() => {
    service = new SocialInsightsService(composio)
  })

  it('returns missing_linkedin_org_urn when connected without org URN', async () => {
    vi.spyOn(service as never, 'resolveIntegrationContext').mockResolvedValue({
      connected: true,
      connectedAccountId: 'ca-1',
      composioUserId: 'user-1',
      metadata: { linkedin_author_urn: 'urn:li:person:1' },
      reason: null,
    })
    vi.spyOn(service as never, 'listPublishedPosts').mockResolvedValue([])
    vi.spyOn(service as never, 'loadCachedInsights').mockResolvedValue(new Map())
    const fetchLinkedInAccount = vi.spyOn(service as never, 'fetchLinkedInAccount')

    const result = await service.getCampaignSocialAnalytics({} as never, 'user-1', 'camp-1', {
      platform: 'linkedin',
    })

    expect(result.connected).toBe(true)
    expect(result.reason).toBe('missing_linkedin_org_urn')
    expect(result.partial).toBe(true)
    expect(fetchLinkedInAccount).not.toHaveBeenCalled()
  })

  it('fetches LinkedIn account metrics when org URN is present', async () => {
    vi.spyOn(service as never, 'resolveIntegrationContext').mockResolvedValue({
      connected: true,
      connectedAccountId: 'ca-1',
      composioUserId: 'user-1',
      metadata: {
        linkedin_organization_urn: 'urn:li:organization:123',
        linkedin_organization_name: 'Acme',
      },
      reason: null,
    })
    vi.spyOn(service as never, 'listPublishedPosts').mockResolvedValue([])
    vi.spyOn(service as never, 'loadCachedInsights').mockResolvedValue(new Map())
    const fetchLinkedInAccount = vi
      .spyOn(service as never, 'fetchLinkedInAccount')
      .mockResolvedValue({
        account: {
          reach: 0,
          follower_count: 100,
          total_interactions: 5,
          engagement_rate: 1.2,
          impressions: 50,
          clicks: 3,
          likes: 2,
          comments: 1,
          shares: 0,
          saves: 0,
          views: 0,
          page_views: 0,
          unique_page_visitors: 0,
        },
        chart: [{ date: '2026-06-01', reach: 0, impressions: 10, engagement: 0 }],
      })

    const result = await service.getCampaignSocialAnalytics({} as never, 'user-1', 'camp-1', {
      platform: 'linkedin',
    })

    expect(result.reason).toBeNull()
    expect(result.partial).toBe(false)
    expect(fetchLinkedInAccount).toHaveBeenCalledOnce()
    expect(result.account.impressions).toBe(50)
    expect(result.account.follower_count).toBe(100)
  })
})

describe('SocialInsightsService Facebook page', () => {
  const composio = { executeTool: vi.fn() } as never
  let service: SocialInsightsService

  beforeEach(() => {
    service = new SocialInsightsService(composio)
  })

  it('returns missing_facebook_page_id when connected without page id', async () => {
    vi.spyOn(service as never, 'resolveIntegrationContext').mockResolvedValue({
      connected: true,
      connectedAccountId: 'ca-fb',
      composioUserId: 'user-1',
      metadata: {},
      reason: null,
    })
    vi.spyOn(service as never, 'listPublishedPosts').mockResolvedValue([])
    vi.spyOn(service as never, 'loadCachedInsights').mockResolvedValue(new Map())
    const fetchFacebookAccount = vi.spyOn(service as never, 'fetchFacebookAccount')

    const result = await service.getCampaignSocialAnalytics({} as never, 'user-1', 'camp-1', {
      platform: 'facebook',
    })

    expect(result.connected).toBe(true)
    expect(result.reason).toBe('missing_facebook_page_id')
    expect(result.partial).toBe(true)
    expect(fetchFacebookAccount).not.toHaveBeenCalled()
  })
})

describe('SocialInsightsService YouTube channel', () => {
  const composio = { executeTool: vi.fn() } as never
  let service: SocialInsightsService

  beforeEach(() => {
    service = new SocialInsightsService(composio)
  })

  it('returns missing_youtube_channel_id when connected without channel id', async () => {
    vi.spyOn(service as never, 'resolveIntegrationContext').mockResolvedValue({
      connected: true,
      connectedAccountId: 'ca-yt',
      composioUserId: 'user-1',
      metadata: {},
      reason: null,
    })
    vi.spyOn(service as never, 'listPublishedPosts').mockResolvedValue([])
    vi.spyOn(service as never, 'loadCachedInsights').mockResolvedValue(new Map())
    const fetchYoutubeAccount = vi.spyOn(service as never, 'fetchYoutubeAccount')

    const result = await service.getCampaignSocialAnalytics({} as never, 'user-1', 'camp-1', {
      platform: 'youtube',
    })

    expect(result.connected).toBe(true)
    expect(result.reason).toBe('missing_youtube_channel_id')
    expect(result.partial).toBe(true)
    expect(fetchYoutubeAccount).not.toHaveBeenCalled()
  })
})
