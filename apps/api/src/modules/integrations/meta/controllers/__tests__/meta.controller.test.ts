import { HttpException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { MetaPublishRequestService } from '../../services/meta-publish-request.service'
import { MetaAdAssetsController } from '../meta-ad-assets.controller'
import { MetaPublishController } from '../meta-publish.controller'
import { MetaWebhooksController } from '../meta-webhooks.controller'

describe('MetaPublishController publishCampaign', () => {
  it('throws when required fields are missing', async () => {
    const api = { publishCampaignBatch: vi.fn() } as any
    const controller = new MetaPublishController(api, {} as any)

    await expect(
      controller.publishCampaign({} as any, { id: 'user-1' }, {}),
    ).rejects.toBeInstanceOf(HttpException)
    expect(api.publishCampaignBatch).not.toHaveBeenCalled()
  })

  it('delegates to batch service and returns response', async () => {
    const expected = {
      success: true as const,
      campaign_id: 'c1',
      meta_campaign_id: 'm1',
      total_ad_sets: 2,
      total_ads: 5,
      published_ad_sets: [],
      published_ads: [],
    }
    const api = {
      publishCampaignBatch: vi.fn().mockResolvedValue(expected),
    } as any
    const controller = new MetaPublishController(api, {} as any)

    const result = await controller.publishCampaign(
      {} as any,
      { id: 'user-1' },
      {
        campaign_id: 'c1',
        ad_account_id: 'act_1',
        page_id: 'p1',
        instagram_user_id: 'ig1',
      },
    )

    expect(api.publishCampaignBatch).toHaveBeenCalledWith(
      {} as any,
      'user-1',
      expect.objectContaining({
        campaign_id: 'c1',
        ad_account_id: 'act_1',
        page_id: 'p1',
        instagram_user_id: 'ig1',
      }),
    )
    expect(result).toEqual(expected)
  })
})

describe('MetaAdAssetsController createPixel', () => {
  it('throws when adAccountId is missing', async () => {
    const api = { createPixel: vi.fn() } as any
    const controller = new MetaAdAssetsController(api)
    await expect(
      controller.createPixel({} as any, { id: 'user-1' }, '', { name: 'Pixel A' }),
    ).rejects.toBeInstanceOf(HttpException)
    expect(api.createPixel).not.toHaveBeenCalled()
  })

  it('delegates to service with validated payload', async () => {
    const api = { createPixel: vi.fn().mockResolvedValue({ id: 'p1', name: 'Pixel A' }) } as any
    const controller = new MetaAdAssetsController(api)
    const res = await controller.createPixel({} as any, { id: 'user-1' }, 'act_1', {
      name: 'Pixel A',
      description: 'desc',
    })
    expect(api.createPixel).toHaveBeenCalledWith({} as any, 'user-1', 'act_1', {
      name: 'Pixel A',
      description: 'desc',
    })
    expect(res).toEqual({ success: true, data: { id: 'p1', name: 'Pixel A' } })
  })
})

describe('MetaPublishController publishAd', () => {
  it('fills publish input from the linked ad set and campaign', async () => {
    const api = {
      publishAd: vi.fn().mockResolvedValue({
        meta_campaign_id: 'mc_1',
        meta_ad_set_id: 'mas_1',
        meta_creative_id: 'mcr_1',
        meta_ad_id: 'ma_1',
      }),
    } as any
    const rows: Record<string, Record<string, unknown>> = {
      ads: { ad_set_id: 'adset_1' },
      ad_sets: {
        name: 'Launch Ad Set',
        daily_budget: 1200,
        lifetime_budget: null,
        targeting: { geo_locations: { countries: ['US'] } },
        start_time: '2026-06-01T00:00:00Z',
        end_time: '2026-06-30T00:00:00Z',
        ad_campaign_id: 'campaign_1',
      },
      ad_campaigns: {
        name: 'Launch Campaign',
        objective: 'OUTCOME_TRAFFIC',
        budget_type: 'CBO',
        daily_budget: 3000,
        lifetime_budget: null,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        schedule_type: 'one_time',
        start_time: '2026-06-02T00:00:00Z',
        end_time: '2026-06-29T00:00:00Z',
        metadata: {
          meta_pixel_id: 'pixel_1',
          meta_custom_event_type: 'PURCHASE',
        },
      },
    }
    const repository = {
      findPublishRequestAd: vi.fn().mockResolvedValue({ data: rows.ads, error: null }),
      findPublishRequestAdSet: vi.fn().mockResolvedValue({ data: rows.ad_sets, error: null }),
      findPublishRequestCampaign: vi
        .fn()
        .mockResolvedValue({ data: rows.ad_campaigns, error: null }),
    }
    const controller = new MetaPublishController(
      api,
      new (MetaPublishRequestService as any)(api, repository),
    )
    const supabase = {
      from: vi.fn((table: string) => {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: rows[table] ?? null }),
        }
      }),
    } as any

    await controller.publishAd(
      supabase,
      { id: 'user-1' },
      {
        ad_id: 'ad_1',
        ad_account_id: 'act_1',
        page_id: 'page_1',
      },
    )

    expect(api.publishAd).toHaveBeenCalledWith(
      supabase,
      'user-1',
      expect.objectContaining({
        ad_id: 'ad_1',
        ad_account_id: 'act_1',
        page_id: 'page_1',
        campaign_name: 'Launch Campaign',
        campaign_objective: 'OUTCOME_TRAFFIC',
        budget_type: 'CBO',
        schedule_type: 'one_time',
        adset_name: 'Launch Ad Set',
        daily_budget: 3000,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: { geo_locations: { countries: ['US'] } },
        pixel_id: 'pixel_1',
        custom_event_type: 'PURCHASE',
        start_time: '2026-06-02T00:00:00Z',
        end_time: '2026-06-29T00:00:00Z',
      }),
    )
  })

  it('accepts missing instagram_user_id', async () => {
    const api = {
      publishAd: vi.fn().mockResolvedValue({
        meta_campaign_id: 'mc_1',
        meta_ad_set_id: 'mas_1',
        meta_creative_id: 'mcr_1',
        meta_ad_id: 'ma_1',
      }),
    } as any
    const repository = {
      findPublishRequestAd: vi.fn().mockResolvedValue({ data: { ad_set_id: null }, error: null }),
      findPublishRequestAdSet: vi.fn(),
      findPublishRequestCampaign: vi.fn(),
    }
    const controller = new MetaPublishController(
      api,
      new (MetaPublishRequestService as any)(api, repository),
    )
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ads') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { ad_set_id: null } }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    } as any

    const result = await controller.publishAd(
      supabase,
      { id: 'user-1' },
      {
        ad_id: 'ad_1',
        ad_account_id: 'act_1',
        page_id: 'page_1',
        campaign_objective: 'OUTCOME_TRAFFIC',
        budget_type: 'ABO',
        schedule_type: 'continuous',
        daily_budget: 1000,
        targeting: { geo_locations: { countries: ['US'] } },
      },
    )

    expect(api.publishAd).toHaveBeenCalledWith(
      supabase,
      'user-1',
      expect.objectContaining({
        ad_id: 'ad_1',
        ad_account_id: 'act_1',
        page_id: 'page_1',
        instagram_user_id: undefined,
      }),
    )
    expect(result).toEqual({
      success: true,
      meta_campaign_id: 'mc_1',
      meta_ad_set_id: 'mas_1',
      meta_creative_id: 'mcr_1',
      meta_ad_id: 'ma_1',
    })
  })
})

describe('MetaWebhooksController handleWebhook', () => {
  it('verifies the signature, delegates payload handling, and returns processed count', async () => {
    const api = {
      handleAdRuleWebhook: vi.fn().mockResolvedValue({ processed: 1 }),
    }
    const metaIntegration = {
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
    }
    const controller = new (MetaWebhooksController as any)({}, api, metaIntegration, {
      client: { from: vi.fn() },
    })
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any

    await controller.handleWebhook(
      {
        rawBody: Buffer.from('{"entry":[]}'),
        body: { entry: [] },
      },
      'sha256=test',
      res,
    )

    expect(metaIntegration.verifyWebhookSignature).toHaveBeenCalledWith(
      Buffer.from('{"entry":[]}'),
      'sha256=test',
    )
    expect(api.handleAdRuleWebhook).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true, processed: 1 })
  })
})
