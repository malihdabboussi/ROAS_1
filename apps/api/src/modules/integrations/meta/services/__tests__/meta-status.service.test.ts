import { describe, expect, it, vi } from 'vitest'
import { MetaStatusService } from '../meta-api/meta-status.service'

describe('MetaStatusService flows', () => {
  it('setAdCampaignMetaStatus refreshes campaign hierarchy and skips child refresh failures', async () => {
    const adSetStatusRows: Array<Record<string, unknown>> = []
    const adRowsByAdSet: Record<string, Array<Record<string, unknown>>> = {
      adset_1: [{ id: 'ad_1', meta_ad_id: 'meta_ad_1' }],
      adset_2: [{ id: 'ad_2', meta_ad_id: 'meta_ad_2' }],
    }

    const client = {
      from: vi.fn((table: string) => {
        const state: Record<string, string> = {}
        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn((field: string, value: string) => {
            state[field] = value
            return builder
          }),
          single: vi.fn(async () => {
            if (table === 'ad_campaigns') {
              if (state['id'] === 'campaign_1') {
                return {
                  data: { id: 'campaign_1', meta_campaign_id: 'meta_campaign_1', metadata: {} },
                  error: null,
                }
              }
              return { data: null, error: { message: 'not found' } }
            }
            return { data: null, error: { message: 'not found' } }
          }),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        }

        if (table === 'ad_sets') {
          return {
            ...builder,
            select: vi.fn(() => ({
              ...builder,
              eq: vi.fn((field: string, value: string) => {
                state[field] = value
                return {
                  ...builder,
                  eq: vi.fn((field2: string, value2: string) => {
                    state[field2] = value2
                    return Promise.resolve({
                      data: adSetStatusRows.length
                        ? adSetStatusRows
                        : [
                            { id: 'adset_1', meta_adset_id: 'meta_adset_1' },
                            { id: 'adset_2', meta_adset_id: 'meta_adset_2' },
                          ],
                      error: null,
                    })
                  }),
                }
              }),
            })),
          }
        }

        if (table === 'ads') {
          return {
            ...builder,
            select: vi.fn(() => ({
              ...builder,
              eq: vi.fn((field: string, value: string) => {
                state[field] = value
                return {
                  ...builder,
                  eq: vi.fn((field2: string, value2: string) => {
                    state[field2] = value2
                    return Promise.resolve({
                      data: adRowsByAdSet[state['ad_set_id'] ?? value] ?? [],
                      error: null,
                    })
                  }),
                }
              }),
            })),
          }
        }

        return builder
      }),
    } as any

    const meta = {
      updateObjectStatus: vi.fn().mockResolvedValue({ success: true }),
    } as any
    const oauth = { getAccessToken: vi.fn().mockResolvedValue('token') } as any
    const repository = {
      findCampaignForStatus: vi.fn().mockResolvedValue({
        data: { id: 'campaign_1', meta_campaign_id: 'meta_campaign_1', metadata: {} },
        error: null,
      }),
      listChildAdSets: vi.fn().mockResolvedValue([
        { id: 'adset_1', meta_adset_id: 'meta_adset_1' },
        { id: 'adset_2', meta_adset_id: 'meta_adset_2' },
      ]),
      listChildAds: vi.fn(async (_client: unknown, _userId: string, adSetId: string) =>
        adRowsByAdSet[adSetId] ?? [],
      ),
    }
    const service = new MetaStatusService(meta, oauth, repository as any)

    vi.spyOn(service, 'refreshAdCampaignStatus').mockResolvedValue({
      ad_campaign_id: 'campaign_1',
      meta_campaign_id: 'meta_campaign_1',
      ad_campaign_effective_status: 'PAUSED',
    })
    vi.spyOn(service, 'refreshAdSetStatus')
      .mockRejectedValueOnce(new Error('refresh adset failed'))
      .mockResolvedValue({
        ad_set_id: 'adset_2',
        meta_adset_id: 'meta_adset_2',
        ad_set_effective_status: 'PAUSED',
        meta_campaign_id: 'meta_campaign_1',
        ad_campaign_effective_status: 'PAUSED',
      })
    const refreshAdSpy = vi.spyOn(service, 'refreshAdHierarchyStatus')
    refreshAdSpy.mockResolvedValue({
      ad_id: 'ad_1',
      meta_ad_id: 'meta_ad_1',
      ad_effective_status: 'PAUSED',
      ad_configured_status: 'PAUSED',
      ad_set_effective_status: 'PAUSED',
      ad_campaign_effective_status: 'PAUSED',
    })

    const result = await service.setAdCampaignMetaStatus(client, 'user_1', 'campaign_1', 'PAUSED')

    expect(result).toEqual({
      ad_campaign_id: 'campaign_1',
      meta_campaign_id: 'meta_campaign_1',
      ad_campaign_effective_status: 'PAUSED',
    })
    expect(meta.updateObjectStatus).toHaveBeenCalledWith('token', 'meta_campaign_1', 'PAUSED')
    expect(refreshAdSpy).toHaveBeenCalledTimes(2)
  })

  it('handleAdRuleWebhook routes AD/ADSET/CAMPAIGN entries and returns processed count', async () => {
    const client = {
      from: vi.fn((table: string) => {
        const state: Record<string, string> = {}
        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn((field: string, value: string) => {
            state[field] = value
            return builder
          }),
          limit: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => {
            if (table === 'ads' && state['meta_ad_id'] === 'meta_ad_1') {
              return { data: { id: 'ad_1', user_id: 'user_1' }, error: null }
            }
            if (table === 'ad_sets' && state['meta_adset_id'] === 'meta_adset_1') {
              return { data: { id: 'adset_1', user_id: 'user_2' }, error: null }
            }
            if (table === 'ad_campaigns' && state['meta_campaign_id'] === 'meta_campaign_1') {
              return { data: { id: 'campaign_1', user_id: 'user_3' }, error: null }
            }
            return { data: null, error: null }
          }),
        }
        return builder
      }),
    } as any

    const repository = {
      findWebhookAd: vi
        .fn()
        .mockResolvedValue({ data: { id: 'ad_1', user_id: 'user_1' }, error: null }),
      findWebhookAdSet: vi
        .fn()
        .mockResolvedValue({ data: { id: 'adset_1', user_id: 'user_2' }, error: null }),
      findWebhookCampaign: vi
        .fn()
        .mockResolvedValue({ data: { id: 'campaign_1', user_id: 'user_3' }, error: null }),
    }
    const service = new MetaStatusService({} as any, {} as any, repository as any)
    vi.spyOn(service, 'refreshAdHierarchyStatus').mockResolvedValue({
      ad_id: 'ad_1',
      meta_ad_id: 'meta_ad_1',
      ad_effective_status: 'PAUSED',
      ad_configured_status: 'PAUSED',
      ad_set_effective_status: 'PAUSED',
      ad_campaign_effective_status: 'PAUSED',
    })
    vi.spyOn(service, 'refreshAdSetStatus').mockResolvedValue({
      ad_set_id: 'adset_1',
      meta_adset_id: 'meta_adset_1',
      ad_set_effective_status: 'PAUSED',
      meta_campaign_id: null,
      ad_campaign_effective_status: null,
    })
    vi.spyOn(service, 'refreshAdCampaignStatus').mockResolvedValue({
      ad_campaign_id: 'campaign_1',
      meta_campaign_id: 'meta_campaign_1',
      ad_campaign_effective_status: 'PAUSED',
    })

    const result = await service.handleAdRuleWebhook(client, {
      entry: [
        {
          changes: [
            { field: 'ads_rules_engine', value: { object_id: 'meta_ad_1', object_type: 'AD' } },
            {
              field: 'ads_rules_engine',
              value: { object_id: 'meta_adset_1', object_type: 'ADSET' },
            },
            {
              field: 'ads_rules_engine',
              value: { object_id: 'meta_campaign_1', object_type: 'CAMPAIGN' },
            },
            { field: 'something_else', value: { object_id: 'skip', object_type: 'AD' } },
          ],
        },
      ],
    })

    expect(result).toEqual({ processed: 3 })
    expect(service.refreshAdHierarchyStatus).toHaveBeenCalledWith(client, 'user_1', 'ad_1')
    expect(service.refreshAdSetStatus).toHaveBeenCalledWith(client, 'user_2', 'adset_1')
    expect(service.refreshAdCampaignStatus).toHaveBeenCalledWith(client, 'user_3', 'campaign_1')
  })
})
