import { describe, expect, it, vi } from 'vitest'
import { ArtifactOffersAdsService } from './artifact-offers-ads.service'

type QueryRecord = {
  table: string
  filters: Record<string, unknown>
  isFilters: Record<string, unknown>
  operation: 'insert' | 'update' | null
  payload: unknown
  selectColumns: string | undefined
  orders: Array<{ column: string; options?: Record<string, unknown> }>
}

function makeQueryClient(
  handler: (
    record: QueryRecord,
    terminal: 'maybeSingle' | 'single' | 'then',
  ) => Promise<{ data: unknown; error: unknown }> | { data: unknown; error: unknown },
) {
  const records: QueryRecord[] = []
  const client = {
    from: vi.fn((table: string) => {
      const record: QueryRecord = {
        table,
        filters: {},
        isFilters: {},
        operation: null,
        payload: null,
        selectColumns: undefined,
        orders: [],
      }
      records.push(record)
      const query: any = {
        select: vi.fn((columns?: string) => {
          record.selectColumns = columns
          return query
        }),
        eq: vi.fn((key: string, value: unknown) => {
          record.filters[key] = value
          return query
        }),
        is: vi.fn((key: string, value: unknown) => {
          record.isFilters[key] = value
          return query
        }),
        order: vi.fn((column: string, options?: Record<string, unknown>) => {
          record.orders.push({ column, options })
          return query
        }),
        insert: vi.fn((payload: unknown) => {
          record.operation = 'insert'
          record.payload = payload
          return query
        }),
        update: vi.fn((payload: unknown) => {
          record.operation = 'update'
          record.payload = payload
          return query
        }),
        maybeSingle: vi.fn(() => handler(record, 'maybeSingle')),
        single: vi.fn(() => handler(record, 'single')),
        then: (
          resolve: (value: { data: unknown; error: unknown }) => unknown,
          reject?: (reason?: unknown) => unknown,
        ) => Promise.resolve(handler(record, 'then')).then(resolve, reject),
      }
      return query
    }),
  }
  return { client, records }
}

function makeTarget(client: unknown) {
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => null),
    resolveCampaignId: vi.fn(async () => 'campaign-1'),
    getUserClient: vi.fn(async () => client),
    isMissionSessionKey: vi.fn(() => false),
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
    },
  }
}

describe('ArtifactOffersAdsService', () => {
  it('lists offers with personal owner scope and campaign filtering', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'offers') return { data: [{ id: 'offer-1' }], error: null }
      return { data: [], error: null }
    })
    const handlers = new ArtifactOffersAdsService().getHandlers(makeTarget(client))

    const result = await handlers.list_offers({}, 'session-1')

    expect(result).toEqual([{ id: 'offer-1' }])
    expect(records[0]).toMatchObject({
      table: 'offers',
      selectColumns: '*',
      filters: { user_id: 'user-1', campaign_id: 'campaign-1' },
      isFilters: { org_id: null },
      orders: [{ column: 'created_at', options: { ascending: false } }],
    })
  })

  it('creates an ad and backfills tracking URL from its ad set campaign', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'ads' && record.operation === 'insert') {
        return {
          data: {
            id: 'ad-1',
            headline: 'Hero Headline',
            image_url: 'https://cdn.example/ad.png',
          },
          error: null,
        }
      }
      if (record.table === 'ad_sets') {
        return { data: { ad_campaign_id: 'ad-campaign-1' }, error: null }
      }
      if (record.table === 'ads' && record.operation === 'update') {
        return { data: null, error: null }
      }
      if (record.table === 'spaces') return { data: [], error: null }
      return { data: null, error: null }
    })
    const handlers = new ArtifactOffersAdsService().getHandlers(makeTarget(client))

    const result = (await handlers.create_ad(
      {
        platform: 'facebook',
        placement: 'feed',
        primary_text: 'Primary',
        headline: 'Hero Headline',
        destination_url: 'https://example.com/offer',
        ad_set_id: 'ad-set-1',
        image_url: 'https://cdn.example/ad.png',
      },
      'session-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      id: 'ad-1',
      tracking_url:
        'https://example.com/offer?utm_source=meta&utm_medium=paid&utm_campaign=ad-campaign-1&utm_adset=ad-set-1&utm_content=ad-1',
      ui_blocks: [
        expect.objectContaining({
          artifactType: 'ad',
          artifactId: 'ad-1',
          name: 'Hero Headline',
        }),
      ],
    })
    expect(
      records.find((record) => record.table === 'ads' && record.operation === 'insert'),
    ).toMatchObject({
      payload: expect.objectContaining({
        user_id: 'user-1',
        org_id: null,
        campaign_id: 'campaign-1',
        ad_set_id: 'ad-set-1',
        destination_url: 'https://example.com/offer',
      }),
    })
    expect(records.find((record) => record.table === 'ad_sets')).toMatchObject({
      filters: { id: 'ad-set-1' },
      selectColumns: 'ad_campaign_id',
    })
    expect(
      records.find((record) => record.table === 'ads' && record.operation === 'update'),
    ).toMatchObject({
      payload: {
        tracking_url:
          'https://example.com/offer?utm_source=meta&utm_medium=paid&utm_campaign=ad-campaign-1&utm_adset=ad-set-1&utm_content=ad-1',
      },
      filters: { id: 'ad-1' },
    })
  })

  it('links every mission-created ad to the active subtask', async () => {
    const subtaskId = '22222222-2222-2222-2222-222222222222'
    const { client } = makeQueryClient((record) => {
      if (record.table === 'ads' && record.operation === 'insert') {
        return { data: { id: 'ad-1', headline: 'Hero Headline' }, error: null }
      }
      if (record.table === 'ads' && record.operation === 'update') {
        return { data: null, error: null }
      }
      if (record.table === 'spaces') return { data: [], error: null }
      return { data: null, error: null }
    })
    const target = {
      ...makeTarget(client),
      isMissionSessionKey: vi.fn(() => true),
      parseAgentIdFromSessionKey: vi.fn(() => 'blaze'),
      resolveMissionContext: vi.fn(async () => ({
        missionId: 'mission-1',
        campaignId: 'campaign-1',
        orgId: null,
      })),
      persistMissionDeliverable: vi.fn(async () => ({ deliverable_id: 'deliverable-1' })),
    }
    const handlers = new ArtifactOffersAdsService().getHandlers(target)

    await handlers.create_ad(
      {
        platform: 'meta',
        placement: 'feed',
        primary_text: 'Primary',
        headline: 'Hero Headline',
        destination_url: 'https://example.com',
      },
      `agent:gateway:subtask:blaze:user-1:${subtaskId}`,
    )

    expect(target.persistMissionDeliverable).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          entity_id: 'ad-1',
          subtask_id: subtaskId,
        }),
      }),
    )
  })

  it('patches generated TSX with owner-scoped ad lookup and update', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'ads' && record.operation === null) {
        return {
          data: {
            id: 'ad-1',
            generated_tsx: 'function Ad(){ return <div>Old copy</div> }',
          },
          error: null,
        }
      }
      if (record.table === 'ads' && record.operation === 'update') {
        return { data: { id: 'ad-1' }, error: null }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactOffersAdsService().getHandlers(makeTarget(client))

    const result = await handlers.patch_ad(
      { ad_id: 'ad-1', find: 'Old copy', replace: 'New copy' },
      'session-1',
    )

    expect(result).toEqual({ success: true, ad_id: 'ad-1', patched: 1 })
    expect(
      records.find((record) => record.table === 'ads' && record.operation === null),
    ).toMatchObject({
      selectColumns: 'id, generated_tsx',
      filters: { id: 'ad-1', user_id: 'user-1' },
      isFilters: { org_id: null },
    })
    expect(
      records.find((record) => record.table === 'ads' && record.operation === 'update'),
    ).toMatchObject({
      payload: { generated_tsx: 'function Ad(){ return <div>New copy</div> }' },
      filters: { id: 'ad-1', user_id: 'user-1' },
      isFilters: { org_id: null },
    })
  })

  it('creates an ad campaign with default objective and space view indexing', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'ad_campaigns' && record.operation === 'insert') {
        return {
          data: { id: 'ad-campaign-1', name: 'Launch Campaign' },
          error: null,
        }
      }
      if (record.table === 'spaces') return { data: [], error: null }
      return { data: null, error: null }
    })
    const handlers = new ArtifactOffersAdsService().getHandlers(makeTarget(client))

    const result = (await handlers.create_ad_campaign(
      { name: 'Launch Campaign', objective: 'INVALID_OBJECTIVE' },
      'session-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      id: 'ad-campaign-1',
      name: 'Launch Campaign',
      ui_blocks: [
        expect.objectContaining({
          artifactType: 'ad-campaign',
          artifactId: 'ad-campaign-1',
          name: 'Launch Campaign',
        }),
      ],
    })
    expect(records.find((record) => record.table === 'ad_campaigns')).toMatchObject({
      operation: 'insert',
      payload: expect.objectContaining({
        user_id: 'user-1',
        org_id: null,
        campaign_id: 'campaign-1',
        name: 'Launch Campaign',
        objective: 'OUTCOME_TRAFFIC',
        budget_type: 'ABO',
      }),
    })
  })
})
