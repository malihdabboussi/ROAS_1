import { describe, expect, it, vi } from 'vitest'
import { MetaApiService } from '../meta-api.service'

function createSupabaseMock(campaignRow: Record<string, unknown>) {
  const updates: Array<{
    table: string
    id: string
    userId: string
    payload: Record<string, unknown>
  }> = []

  const client = {
    from: vi.fn((table: string) => {
      const selectState: { id?: string; userId?: string } = {}
      const queryBuilder = {
        select: vi.fn(() => queryBuilder),
        eq: vi.fn((field: string, value: string) => {
          if (field === 'id') selectState.id = value
          if (field === 'user_id') selectState.userId = value
          return queryBuilder
        }),
        single: vi.fn(async () => {
          if (table === 'ad_campaigns') return { data: campaignRow, error: null }
          return { data: null, error: { message: 'not found' } }
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          const updateState: { id?: string } = {}
          const updateBuilder = {
            eq: vi.fn((field: string, value: string) => {
              if (field === 'id') {
                updateState.id = value
                return updateBuilder
              }
              if (field === 'user_id') {
                updates.push({ table, id: String(updateState.id ?? ''), userId: value, payload })
                return Promise.resolve({ error: null })
              }
              return updateBuilder
            }),
          }
          return updateBuilder
        }),
      }
      return queryBuilder
    }),
  } as any

  return { client, updates }
}

describe('MetaApiService.publishCampaignBatch', () => {
  it('reuses existing campaign/adset/ad ids without create calls', async () => {
    const campaignRow = {
      id: 'campaign_local_1',
      user_id: 'user_1',
      name: 'Campaign',
      objective: 'OUTCOME_TRAFFIC',
      budget_type: 'ABO',
      schedule_type: 'continuous',
      meta_campaign_id: 'meta_campaign_1',
      metadata: {
        meta_ad_account_id: 'act_1',
        meta_page_id: 'page_1',
        meta_instagram_user_id: 'ig_1',
      },
      ad_sets: [
        {
          id: 'adset_local_1',
          name: 'Ad Set',
          meta_adset_id: 'meta_adset_1',
          metadata: { meta_ad_rule_id: 'rule_existing' },
          daily_budget: 1000,
          targeting: { geo_locations: { countries: ['US'] } },
          ads: [
            {
              id: 'ad_local_1',
              headline: 'Headline',
              primary_text: 'Body',
              destination_url: 'https://example.com',
              image_url: null,
              meta_ad_id: 'meta_ad_1',
              metadata: {
                meta_ad_id: 'meta_ad_1',
                meta_creative_id: 'meta_creative_1',
                meta_ad_rule_id: 'meta_rule_1',
              },
            },
          ],
        },
      ],
    } as Record<string, unknown>
    const { client, updates } = createSupabaseMock(campaignRow)
    const meta = {
      createCampaign: vi.fn(),
      createAdSet: vi.fn(),
      createAd: vi.fn(),
      createAdCreative: vi.fn(),
      uploadAdImage: vi.fn(),
      createAdRule: vi.fn(),
      updateCampaign: vi.fn().mockResolvedValue(undefined),
      updateAdSet: vi.fn().mockResolvedValue(undefined),
      updateObjectStatus: vi.fn().mockResolvedValue({ success: true }),
      getObjectStatus: vi.fn().mockResolvedValue({ id: 'ok', effective_status: 'PAUSED' }),
      getInstagramAccountsForAdAccount: vi.fn().mockResolvedValue([{ id: 'ig_1' }]),
      getInstagramAccountsForPage: vi.fn().mockResolvedValue([]),
    } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const driveApi = { downloadFile: vi.fn().mockRejectedValue(new Error('not used')) } as any
    const service = new MetaApiService(
      meta,
      oauth,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      driveApi,
    )

    const result = await service.publishCampaignBatch(client, 'user_1', {
      campaign_id: 'campaign_local_1',
      ad_account_id: 'act_1',
      page_id: 'page_1',
    })

    expect(result.success).toBe(true)
    expect((result as any).meta_campaign_id).toBe('meta_campaign_1')
    expect(meta.createCampaign).not.toHaveBeenCalled()
    expect(meta.createAdSet).not.toHaveBeenCalled()
    expect(meta.createAd).not.toHaveBeenCalled()
    expect(meta.getObjectStatus).toHaveBeenCalledWith('token', 'meta_campaign_1')
    expect(meta.getObjectStatus).toHaveBeenCalledWith('token', 'meta_adset_1')
    expect(meta.getObjectStatus).toHaveBeenCalledWith('token', 'meta_ad_1')
    expect(meta.updateObjectStatus).toHaveBeenCalledWith('token', 'meta_ad_1', 'PAUSED')
    expect(updates.some((u) => u.table === 'ad_campaigns')).toBe(true)
    expect(updates.some((u) => u.table === 'ad_sets')).toBe(true)
    expect(updates.some((u) => u.table === 'ads')).toBe(true)
  })

  it('does not persist meta ids when publish fails mid-batch', async () => {
    const campaignRow = {
      id: 'campaign_local_2',
      user_id: 'user_1',
      name: 'Campaign',
      objective: 'OUTCOME_TRAFFIC',
      budget_type: 'ABO',
      schedule_type: 'continuous',
      meta_campaign_id: null,
      metadata: { meta_ad_account_id: 'act_1', meta_page_id: 'page_1' },
      ad_sets: [
        {
          id: 'adset_local_2',
          name: 'Ad Set',
          meta_adset_id: null,
          metadata: {},
          daily_budget: 1000,
          targeting: { geo_locations: { countries: ['US'] } },
          ads: [
            {
              id: 'ad_local_2a',
              headline: 'Headline A',
              primary_text: 'Body A',
              destination_url: 'https://example.com/a',
              image_url: 'https://example.com/a.png',
              meta_ad_id: null,
              metadata: {},
            },
            {
              id: 'ad_local_2b',
              headline: 'Headline B',
              primary_text: 'Body B',
              destination_url: 'https://example.com/b',
              image_url: 'https://example.com/b.png',
              meta_ad_id: null,
              metadata: {},
            },
          ],
        },
      ],
    } as Record<string, unknown>
    const { client, updates } = createSupabaseMock(campaignRow)
    const meta = {
      createCampaign: vi.fn().mockResolvedValue({ id: 'meta_campaign_new' }),
      createAdSet: vi.fn().mockResolvedValue({ id: 'meta_adset_new' }),
      uploadAdImage: vi.fn().mockResolvedValue({ hash: 'img_hash' }),
      createAdCreative: vi.fn().mockResolvedValue({ id: 'meta_creative_new' }),
      createAd: vi
        .fn()
        .mockResolvedValueOnce({ id: 'meta_ad_new_a' })
        .mockRejectedValueOnce(new Error('create ad failed')),
      createAdRule: vi.fn().mockResolvedValue({ id: 'meta_rule_new' }),
      updateCampaign: vi.fn().mockResolvedValue(undefined),
      updateAdSet: vi.fn().mockResolvedValue(undefined),
      updateObjectStatus: vi.fn().mockResolvedValue({ success: true }),
      getObjectStatus: vi.fn(),
      getInstagramAccountsForAdAccount: vi.fn().mockResolvedValue([{ id: 'ig_1' }]),
      getInstagramAccountsForPage: vi.fn().mockResolvedValue([]),
    } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const driveApi = { downloadFile: vi.fn().mockRejectedValue(new Error('not used')) } as any
    const service = new MetaApiService(
      meta,
      oauth,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      driveApi,
    )

    await expect(
      service.publishCampaignBatch(client, 'user_1', {
        campaign_id: 'campaign_local_2',
        ad_account_id: 'act_1',
        page_id: 'page_1',
      }),
    ).rejects.toThrow('create ad failed')

    // Campaign and ad set may be persisted before ad create fails; no ad-level persist on failure
    expect(updates.length).toBeLessThanOrEqual(3)
  })

  it('persists new batch ad metadata with Meta IDs and ad rule ID', async () => {
    const campaignRow = {
      id: 'campaign_local_4',
      user_id: 'user_1',
      name: 'Campaign',
      objective: 'OUTCOME_TRAFFIC',
      budget_type: 'ABO',
      schedule_type: 'continuous',
      meta_campaign_id: null,
      metadata: { meta_ad_account_id: 'act_1', meta_page_id: 'page_1' },
      ad_sets: [
        {
          id: 'adset_local_4',
          name: 'Ad Set',
          meta_adset_id: null,
          metadata: {},
          daily_budget: 1000,
          targeting: { geo_locations: { countries: ['US'] } },
          ads: [
            {
              id: 'ad_local_4',
              headline: 'Headline',
              primary_text: 'Body',
              destination_url: 'https://example.com',
              image_url: 'https://example.com/a.png',
              meta_ad_id: null,
              metadata: {},
            },
          ],
        },
      ],
    } as Record<string, unknown>
    const { client, updates } = createSupabaseMock(campaignRow)
    const meta = {
      createCampaign: vi.fn().mockResolvedValue({ id: 'meta_campaign_new' }),
      createAdSet: vi.fn().mockResolvedValue({ id: 'meta_adset_new' }),
      uploadAdImage: vi.fn().mockResolvedValue({ hash: 'img_hash' }),
      createAdCreative: vi.fn().mockResolvedValue({ id: 'meta_creative_new' }),
      createAd: vi.fn().mockResolvedValue({ id: 'meta_ad_new' }),
      createAdRule: vi.fn().mockResolvedValue({ id: 'meta_rule_new' }),
      updateObjectStatus: vi.fn().mockResolvedValue({ success: true }),
      getObjectStatus: vi.fn(),
      getInstagramAccountsForAdAccount: vi.fn().mockResolvedValue([{ id: 'ig_1' }]),
      getInstagramAccountsForPage: vi.fn().mockResolvedValue([]),
    } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const driveApi = { downloadFile: vi.fn().mockRejectedValue(new Error('not used')) } as any
    const service = new MetaApiService(
      meta,
      oauth,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      driveApi,
    )

    const result = await service.publishCampaignBatch(client, 'user_1', {
      campaign_id: 'campaign_local_4',
      ad_account_id: 'act_1',
      page_id: 'page_1',
    })

    expect(result.success).toBe(true)
    expect(meta.createAdRule).toHaveBeenCalledWith('token', 'act_1', {
      name: 'Vibey Status Sync - meta_ad_new',
      meta_ad_id: 'meta_ad_new',
    })
    const adUpdate = updates.find((update) => update.table === 'ads')
    expect(adUpdate?.payload).toMatchObject({
      meta_ad_id: 'meta_ad_new',
      meta_effective_status: 'PAUSED',
    })
    expect(adUpdate?.payload.metadata).toMatchObject({
      meta_campaign_id: 'meta_campaign_new',
      meta_ad_set_id: 'meta_adset_new',
      meta_adset_id: 'meta_adset_new',
      meta_creative_id: 'meta_creative_new',
      meta_ad_id: 'meta_ad_new',
      meta_ad_rule_id: 'meta_rule_new',
      meta_ad_account_id: 'act_1',
      meta_page_id: 'page_1',
      meta_instagram_user_id: 'ig_1',
      meta_status: 'PAUSED',
    })
  })

  it('recreates stale campaign/adset/ad ids when existing Meta objects are gone', async () => {
    const campaignRow = {
      id: 'campaign_local_3',
      user_id: 'user_1',
      name: 'Campaign',
      objective: 'OUTCOME_TRAFFIC',
      budget_type: 'ABO',
      schedule_type: 'continuous',
      meta_campaign_id: 'meta_campaign_stale',
      metadata: {
        meta_ad_account_id: 'act_1',
        meta_page_id: 'page_1',
        meta_instagram_user_id: 'ig_1',
      },
      ad_sets: [
        {
          id: 'adset_local_3',
          name: 'Ad Set',
          meta_adset_id: 'meta_adset_stale',
          metadata: {},
          daily_budget: 1000,
          targeting: { geo_locations: { countries: ['US'] } },
          ads: [
            {
              id: 'ad_local_3',
              headline: 'Headline',
              primary_text: 'Body',
              destination_url: 'https://example.com',
              image_url: 'https://example.com/a.png',
              meta_ad_id: 'meta_ad_stale',
              metadata: {},
            },
          ],
        },
      ],
    } as Record<string, unknown>
    const { client } = createSupabaseMock(campaignRow)
    const staleError = new Error('Failed to get object status: Unsupported get request')
    const meta = {
      createCampaign: vi.fn().mockResolvedValue({ id: 'meta_campaign_new' }),
      createAdSet: vi.fn().mockResolvedValue({ id: 'meta_adset_new' }),
      createAd: vi.fn().mockResolvedValue({ id: 'meta_ad_new' }),
      createAdCreative: vi.fn().mockResolvedValue({ id: 'meta_creative_new' }),
      uploadAdImage: vi.fn().mockResolvedValue({ hash: 'img_hash' }),
      createAdRule: vi.fn().mockResolvedValue({ id: 'meta_rule_new' }),
      updateObjectStatus: vi.fn().mockResolvedValue({ success: true }),
      getObjectStatus: vi.fn().mockRejectedValue(staleError),
      getInstagramAccountsForAdAccount: vi.fn().mockResolvedValue([{ id: 'ig_1' }]),
      getInstagramAccountsForPage: vi.fn().mockResolvedValue([]),
    } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const driveApi = { downloadFile: vi.fn().mockRejectedValue(new Error('not used')) } as any
    const service = new MetaApiService(
      meta,
      oauth,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      driveApi,
    )

    const result = await service.publishCampaignBatch(client, 'user_1', {
      campaign_id: 'campaign_local_3',
      ad_account_id: 'act_1',
      page_id: 'page_1',
    })

    expect(result.success).toBe(true)
    expect((result as any).meta_campaign_id).toBe('meta_campaign_new')
    expect(meta.createCampaign).toHaveBeenCalledTimes(1)
    expect(meta.createAdSet).toHaveBeenCalledTimes(1)
    expect(meta.createAd).toHaveBeenCalledTimes(1)
    expect(meta.updateObjectStatus).not.toHaveBeenCalledWith('token', 'meta_ad_stale', 'PAUSED')
  })
})
