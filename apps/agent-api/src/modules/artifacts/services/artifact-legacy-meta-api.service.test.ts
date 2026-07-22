import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyMetaApiService } from './artifact-legacy-meta-api.service'

describe('ArtifactLegacyMetaApiService.getMetaAdsInsights', () => {
  const service = new ArtifactLegacyMetaApiService()
  const target = {}
  const metaApiCall = vi.spyOn(service, 'metaApiCall')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-22T12:00:00.000Z'))
    metaApiCall.mockReset()
    metaApiCall.mockResolvedValue({ success: true })
  })

  afterEach(() => vi.useRealTimers())

  it('converts last_30d into an exact inclusive UTC date range', async () => {
    await service.getMetaAdsInsights(
      target,
      { campaign_id: 'campaign-uuid', level: 'campaign', date_preset: 'last_30d' },
      'session-1',
    )

    expect(metaApiCall).toHaveBeenCalledWith(
      target,
      'GET',
      '/insights?campaignId=campaign-uuid&level=campaign&start_date=2026-06-23&end_date=2026-07-22',
      'session-1',
    )
  })

  it('uses local hierarchy IDs returned by the preceding insights level', async () => {
    await service.getMetaAdsInsights(
      target,
      {
        campaign_id: 'campaign-uuid',
        level: 'adset',
        ad_campaign_id: 'local-ad-campaign-uuid',
        start_date: '2026-07-01',
        end_date: '2026-07-22',
      },
      'session-1',
    )

    expect(metaApiCall).toHaveBeenCalledWith(
      target,
      'GET',
      '/insights?campaignId=campaign-uuid&level=adset&adCampaignId=local-ad-campaign-uuid&start_date=2026-07-01&end_date=2026-07-22',
      'session-1',
    )
  })
})
