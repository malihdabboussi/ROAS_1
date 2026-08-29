import { describe, expect, it, vi } from 'vitest'
import { ArtifactAnalyticsService } from './artifact-analytics.service'

describe('ArtifactAnalyticsService source-of-truth contract', () => {
  it('identifies the live dashboard as the canonical mutable campaign source', async () => {
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      getUserClient: vi.fn(async () => ({ kind: 'user-client' })),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      mainApiCall: vi.fn(async () => ({
        fetched_at: '2026-08-29T12:00:00.000Z',
        kpis: { roas: 2.4 },
      })),
    }
    const service = new ArtifactAnalyticsService()
    const handler = service.getHandlers(target).get_campaign_main_dashboard

    const result = (await handler(
      { campaign_id: 'campaign-1', refresh: true },
      'session-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      fetched_at: '2026-08-29T12:00:00.000Z',
      canonical_source: {
        system: 'campaign_reporting',
        owner: 'main_dashboard',
        mutable: true,
        campaign_id: 'campaign-1',
      },
      as_of: '2026-08-29T12:00:00.000Z',
      evidence: [
        {
          action: 'get_campaign_main_dashboard',
          campaign_id: 'campaign-1',
          refresh_requested: true,
        },
      ],
      brain_context: null,
    })
  })
})
