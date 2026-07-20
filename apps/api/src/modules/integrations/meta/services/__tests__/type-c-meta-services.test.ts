import { Test } from '@nestjs/testing'
import { describe, expect, it, vi } from 'vitest'
import { MetaEligibilityRepository } from '../../repositories/meta-eligibility.repository'
import { MetaInsightsRepository } from '../../repositories/meta-insights.repository'
import { MetaPublishRepository } from '../../repositories/meta-publish.repository'
import { MetaSyncRepository } from '../../repositories/meta-sync.repository'
import { MetaIntegration } from '../../integrations/meta.integration'
import { GoogleDriveApiService } from '../../../google-drive/services/google-drive-api.service'
import { MetaAccountsService } from '../meta-api/meta-accounts.service'
import { MetaBudgetService } from '../meta-api/meta-budget.service'
import { MetaInsightsService } from '../meta-api/meta-insights.service'
import { MetaPublishBatchService } from '../meta-api/meta-publish-batch.service'
import { MetaPublishBatchPersistenceService } from '../meta-api/meta-publish-batch-persistence.service'
import { MetaPublishMediaService } from '../meta-api/meta-publish-media.service'
import { MetaPublishSharedService } from '../meta-api/meta-publish-shared.service'
import { MetaPublishSingleService } from '../meta-api/meta-publish-single.service'
import { MetaSyncService } from '../meta-api/meta-sync.service'
import { MetaUpdateService } from '../meta-api/meta-update.service'
import { MetaIntegrationsEligibilityService } from '../meta-integrations-eligibility.service'
import { MetaOAuthService } from '../meta-oauth.service'

function createTableClient(rows: Record<string, unknown>) {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = []
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = []

  const client = {
    from: vi.fn((table: string) => {
      const builder: Record<string, any> = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        in: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        lte: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        single: vi.fn(async () => {
          const row = rows[table] ?? null
          return { data: row, error: row ? null : { message: 'not found' } }
        }),
        maybeSingle: vi.fn(async () => ({ data: rows[table] ?? null, error: null })),
        update: vi.fn((payload: Record<string, unknown>) => {
          updates.push({ table, payload })
          return builder
        }),
        insert: vi.fn((payload: Record<string, unknown>) => {
          inserts.push({ table, payload })
          return builder
        }),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
          Promise.resolve({
            data: Array.isArray(rows[table]) ? rows[table] : rows[table] ? [rows[table]] : [],
            error: null,
          }).then(resolve),
      }

      const originalSingle = builder.single
      builder.single = vi.fn(async () => {
        if (inserts.some((insert) => insert.table === table)) {
          return { data: { id: `${table}_local_1` }, error: null }
        }
        return originalSingle()
      })

      return builder
    }),
  } as any

  return { client, updates, inserts }
}

describe('Type C Meta service behavior', () => {
  it('resolves repository-backed Meta services through Nest DI', async () => {
    const mod = await Test.createTestingModule({
      providers: [
        { provide: MetaIntegration, useValue: {} },
        { provide: MetaOAuthService, useValue: {} },
        { provide: GoogleDriveApiService, useValue: {} },
        MetaInsightsRepository,
        MetaPublishRepository,
        MetaPublishSharedService,
        MetaInsightsService,
        MetaBudgetService,
        MetaUpdateService,
        MetaPublishMediaService,
        MetaPublishBatchPersistenceService,
        MetaPublishSingleService,
        MetaPublishBatchService,
      ],
    }).compile()

    expect(mod.get(MetaInsightsService)).toBeInstanceOf(MetaInsightsService)
    expect(mod.get(MetaBudgetService)).toBeInstanceOf(MetaBudgetService)
    expect(mod.get(MetaUpdateService)).toBeInstanceOf(MetaUpdateService)
    expect(mod.get(MetaPublishMediaService)).toBeInstanceOf(MetaPublishMediaService)
    expect(mod.get(MetaPublishBatchPersistenceService)).toBeInstanceOf(
      MetaPublishBatchPersistenceService,
    )
    expect(mod.get(MetaPublishSingleService)).toBeInstanceOf(MetaPublishSingleService)
    expect(mod.get(MetaPublishBatchService)).toBeInstanceOf(MetaPublishBatchService)
  })

  it('publishes a single-image ad and persists Meta IDs through the facade service', async () => {
    const ad = {
      id: 'ad_1',
      ad_set_id: 'adset_1',
      headline: 'Launch headline',
      primary_text: 'Launch body',
      description: 'Launch description',
      destination_url: 'https://example.com/launch',
      image_url: 'https://example.com/ad.png',
      ad_format: 'SINGLE_IMAGE',
      placement_images: null,
      metadata: {},
      cta_type: 'LEARN_MORE',
    }
    const repository = {
      findAdForPublish: vi.fn().mockResolvedValue({ data: ad, error: null }),
      findLinkedAdSet: vi.fn().mockResolvedValue({
        data: {
          id: 'adset_1',
          ad_campaign_id: 'campaign_1',
          meta_adset_id: null,
          metadata: {},
        },
        error: null,
      }),
      findLinkedCampaign: vi.fn().mockResolvedValue({
        data: { id: 'campaign_1', meta_campaign_id: null, metadata: {} },
        error: null,
      }),
      updateCampaign: vi.fn().mockResolvedValue({ error: null }),
      updateAdSet: vi.fn().mockResolvedValue({ error: null }),
      updatePublishTable: vi.fn().mockResolvedValue({ error: null }),
    }
    const meta = {
      getInstagramAccountsForAdAccount: vi.fn().mockResolvedValue([{ id: 'ig_1' }]),
      getInstagramAccountsForPage: vi.fn().mockResolvedValue([]),
      uploadAdImage: vi.fn().mockResolvedValue({ hash: 'image_hash' }),
      createCampaign: vi.fn().mockResolvedValue({ id: 'meta_campaign_1' }),
      createAdSet: vi.fn().mockResolvedValue({ id: 'meta_adset_1' }),
      createAdCreative: vi.fn().mockResolvedValue({ id: 'meta_creative_1' }),
      createAd: vi.fn().mockResolvedValue({ id: 'meta_ad_1' }),
      createAdRule: vi.fn().mockResolvedValue({ id: 'rule_1' }),
    } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const shared = new MetaPublishSharedService(meta)
    const driveApi = { downloadFile: vi.fn() } as any
    const media = new MetaPublishMediaService(meta, driveApi)
    const service = new MetaPublishSingleService(meta, oauth, shared, media, repository as any)

    await expect(
      service.publishAd({} as any, 'user_1', {
        ad_id: 'ad_1',
        ad_account_id: 'act_1',
        page_id: 'page_1',
        campaign_name: 'Campaign',
        adset_name: 'Ad Set',
        targeting: { geo_locations: { countries: ['US'] } },
        daily_budget: 1500,
      }),
    ).resolves.toEqual({
      meta_campaign_id: 'meta_campaign_1',
      meta_ad_set_id: 'meta_adset_1',
      meta_creative_id: 'meta_creative_1',
      meta_ad_id: 'meta_ad_1',
    })

    expect(meta.uploadAdImage).toHaveBeenCalledWith('token', 'act_1', 'https://example.com/ad.png')
    expect(meta.createCampaign).toHaveBeenCalledWith(
      'token',
      'act_1',
      expect.objectContaining({
        name: 'Campaign',
        objective: 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        is_cbo: false,
      }),
    )
    expect(meta.createAdSet).toHaveBeenCalledWith(
      'token',
      'act_1',
      expect.objectContaining({
        campaign_id: 'meta_campaign_1',
        name: 'Ad Set',
        daily_budget: 1500,
        status: 'PAUSED',
      }),
    )
    expect(meta.createAdCreative).toHaveBeenCalledWith(
      'token',
      'act_1',
      expect.objectContaining({
        image_hash: 'image_hash',
        instagram_user_id: 'ig_1',
        link: 'https://example.com/launch',
      }),
    )
    expect(meta.createAd).toHaveBeenCalledWith(
      'token',
      'act_1',
      expect.objectContaining({
        adset_id: 'meta_adset_1',
        creative_id: 'meta_creative_1',
        status: 'PAUSED',
      }),
    )
    expect(repository.updatePublishTable).toHaveBeenCalledTimes(3)
    expect(repository.updatePublishTable).toHaveBeenCalledWith(
      {},
      'user_1',
      'ads',
      'ad_1',
      expect.objectContaining({
        meta_ad_id: 'meta_ad_1',
        meta_effective_status: 'PAUSED',
      }),
    )
  })

  it('updates a campaign budget using the Meta ID stored in metadata', async () => {
    const { client, updates } = createTableClient({
      ad_campaigns: {
        id: 'campaign_1',
        meta_campaign_id: null,
        metadata: { meta_campaign_id: 'meta_campaign_1' },
      },
    })
    const meta = { updateObjectBudget: vi.fn().mockResolvedValue({ success: true }) } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const service = new MetaBudgetService(meta, oauth, new MetaPublishRepository())

    await expect(
      service.updateCampaignBudget(client, 'user_1', 'campaign_1', { daily_budget: 1200 }),
    ).resolves.toEqual({
      success: true,
      ad_campaign_id: 'campaign_1',
      meta_campaign_id: 'meta_campaign_1',
      daily_budget: 1200,
    })
    expect(meta.updateObjectBudget).toHaveBeenCalledWith('token', 'meta_campaign_1', {
      daily_budget: 1200,
    })
    expect(updates).toEqual([{ table: 'ad_campaigns', payload: { daily_budget: 1200 } }])
  })

  it('syncs local ad set update fields after updating Meta', async () => {
    const { client, updates } = createTableClient({
      ad_sets: {
        id: 'adset_1',
        meta_adset_id: null,
        metadata: { meta_ad_set_id: 'meta_adset_1' },
      },
    })
    const meta = { updateAdSet: vi.fn().mockResolvedValue({ success: true }) } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const service = new MetaUpdateService(meta, oauth, new MetaPublishRepository())

    await expect(
      service.updateAdSetOnMeta(client, 'user_1', 'adset_1', {
        name: 'Updated Ad Set',
        status: 'PAUSED',
        daily_budget: 900,
      }),
    ).resolves.toEqual({
      success: true,
      ad_set_id: 'adset_1',
      meta_adset_id: 'meta_adset_1',
      updated_fields: ['name', 'status', 'daily_budget'],
    })
    expect(meta.updateAdSet).toHaveBeenCalledWith('token', 'meta_adset_1', {
      name: 'Updated Ad Set',
      status: 'PAUSED',
      daily_budget: 900,
    })
    expect(updates).toEqual([
      {
        table: 'ad_sets',
        payload: {
          name: 'Updated Ad Set',
          meta_effective_status: 'PAUSED',
          daily_budget: 900,
        },
      },
    ])
  })

  it('summarizes campaign insights from Meta metrics', async () => {
    const { client } = createTableClient({
      ad_campaigns: [
        {
          id: 'campaign_1',
          name: 'Campaign',
          meta_campaign_id: 'meta_campaign_1',
          meta_effective_status: 'ACTIVE',
          daily_budget: 1000,
          lifetime_budget: null,
          metadata: { meta_ad_account_id: 'act_1' },
        },
      ],
    })
    const meta = {
      getObjectInsights: vi.fn().mockResolvedValue({
        spend: '10',
        impressions: '100',
        reach: '90',
        clicks: '5',
        ctr: '5',
        cpc: '2',
        cpm: '100',
        actions: [{ action_type: 'lead', value: '2' }],
        action_values: [{ action_type: 'purchase', value: '30' }],
      }),
    } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const service = new MetaInsightsService(meta, oauth, new MetaInsightsRepository())

    const result = await service.getInsights(client, 'user_1', {
      campaignId: 'store_campaign_1',
      level: 'campaign',
    })

    expect(result.summary).toMatchObject({
      spend: 10,
      impressions: 100,
      clicks: 5,
      leads: 2,
      revenue: 30,
      roas: 3,
    })
    expect(result.rows[0]).toMatchObject({
      id: 'campaign_1',
      name: 'Campaign',
      level: 'campaign',
      meta_id: 'meta_campaign_1',
      ad_account_id: 'act_1',
    })
  })

  it('uses Meta completed registrations as campaign results without losing the ad account', async () => {
    const { client } = createTableClient({
      ad_campaigns: [
        {
          id: 'campaign_registration',
          name: 'Webinar Campaign',
          meta_campaign_id: 'meta_campaign_registration',
          meta_ad_account_id: '1487555021386771',
          meta_effective_status: 'ACTIVE',
          daily_budget: 60000,
          lifetime_budget: null,
          metadata: {},
        },
      ],
    })
    const meta = {
      getObjectInsights: vi.fn().mockResolvedValue({
        spend: '2290',
        impressions: '76214',
        reach: '60000',
        clicks: '1985',
        ctr: '2.60',
        cpc: '1.15',
        cpm: '30.05',
        actions: [
          { action_type: 'complete_registration', value: '151' },
          { action_type: 'offsite_conversion.fb_pixel_complete_registration', value: '151' },
        ],
        cost_per_action_type: [
          {
            action_type: 'offsite_conversion.fb_pixel_complete_registration',
            value: '15.16',
          },
        ],
      }),
    } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const service = new MetaInsightsService(meta, oauth, new MetaInsightsRepository())

    const result = await service.getInsights(client, 'user_1', {
      campaignId: 'store_campaign_1',
      level: 'campaign',
    })

    expect(result.summary).toMatchObject({ leads: 151, results: 151 })
    expect(result.rows[0]).toMatchObject({
      ad_account_id: '1487555021386771',
      leads: 151,
      results: 151,
      result_type: 'registration',
      cost_per_result: 15.16,
    })
  })

  it('syncs a fetched Meta hierarchy into new local campaign, ad set, and ad rows', async () => {
    const { client, inserts } = createTableClient({})
    const meta = {
      fetchFullHierarchy: vi.fn().mockResolvedValue({
        total_campaigns: 1,
        total_ad_sets: 1,
        total_ads: 1,
        campaigns: [
          {
            id: 'meta_campaign_1',
            name: 'Meta Campaign',
            objective: 'OUTCOME_TRAFFIC',
            effective_status: 'ACTIVE',
            daily_budget: '2500',
            ad_sets: [
              {
                id: 'meta_adset_1',
                name: 'Meta Ad Set',
                effective_status: 'ACTIVE',
                daily_budget: '1500',
                targeting: { geo_locations: { countries: ['US'] } },
                ads: [
                  {
                    id: 'meta_ad_1',
                    name: 'Meta Ad',
                    effective_status: 'ACTIVE',
                    creative: {
                      id: 'creative_1',
                      image_url: 'https://example.com/image.png',
                      body: 'Primary text',
                      title: 'Headline',
                      call_to_action_type: 'LEARN_MORE',
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
    } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const shared = { normalizeObjective: vi.fn().mockReturnValue('OUTCOME_TRAFFIC') } as any
    const service = new MetaSyncService(meta, oauth, shared, new MetaSyncRepository())

    await expect(
      service.syncAdAccount(client, 'user_1', 'store_campaign_1', 'act_1'),
    ).resolves.toEqual({
      campaigns_created: 1,
      campaigns_updated: 0,
      ad_sets_created: 1,
      ad_sets_updated: 0,
      ads_created: 1,
      ads_updated: 0,
      total_campaigns: 1,
      total_ad_sets: 1,
      total_ads: 1,
    })
    expect(inserts.map((insert) => insert.table)).toEqual(['ad_campaigns', 'ad_sets', 'ads'])
    expect(inserts[0].payload).toMatchObject({
      user_id: 'user_1',
      campaign_id: 'store_campaign_1',
      meta_campaign_id: 'meta_campaign_1',
      daily_budget: 25,
      source: 'meta',
    })
  })

  it('allows Meta connection for platform admins', async () => {
    const { client } = createTableClient({
      user_profiles: { role: 'admin' },
    })
    const repository = new MetaEligibilityRepository({ client } as any)
    const service = new MetaIntegrationsEligibilityService(repository)

    await expect(service.isEligible('user_1', null)).resolves.toBe(true)
  })

  it('gets delivery estimates from local ad set targeting and campaign ad account metadata', async () => {
    const adSet = {
      id: 'adset_1',
      targeting: { geo_locations: { countries: ['US'] } },
      optimization_goal: 'LANDING_PAGE_VIEWS',
      ad_campaign_id: 'campaign_1',
    }
    const campaign = {
      metadata: { meta_ad_account_id: 'act_1' },
    }
    const { client } = createTableClient({
      ad_sets: adSet,
      ad_campaigns: campaign,
    })
    const meta = {
      getDeliveryEstimate: vi.fn().mockResolvedValue({
        estimate_mau_lower_bound: 100,
        estimate_mau_upper_bound: 200,
        estimate_dau: 50,
        estimate_ready: true,
        daily_outcomes_curve: [],
      }),
    } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const repository = {
      findDeliveryAdSet: vi.fn().mockResolvedValue({ data: adSet, error: null }),
      findCampaignMetadata: vi.fn().mockResolvedValue({ metadata: campaign.metadata }),
      findDefaultConnectedMetaIntegration: vi.fn(),
    }
    const service = new (MetaAccountsService as any)(meta, oauth, repository)

    await expect(service.getDeliveryEstimate(client, 'user_1', 'adset_1')).resolves.toEqual({
      estimate_mau_lower_bound: 100,
      estimate_mau_upper_bound: 200,
      estimate_dau: 50,
      estimate_ready: true,
      daily_outcomes_curve: [],
    })

    expect(meta.getDeliveryEstimate).toHaveBeenCalledWith(
      'token',
      'act_1',
      { geo_locations: { countries: ['US'] } },
      'LINK_CLICKS',
    )
  })
})
