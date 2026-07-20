import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyStateMetaService } from './artifact-legacy-state-meta.service'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

function makeSupabase() {
  const upserts: Array<{ table: string; payload: Record<string, unknown> }> = []
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = []
  const selects: Array<{ table: string; columns: string }> = []

  const resolveResult = (table: string, columns: string, operation: string) => {
    if (table === 'user_agent_state') {
      if (operation === 'upsert') return { data: { updated_at: '2026-06-19T06:00:00.000Z' } }
      return { data: { state_content: 'Existing state', updated_at: 'before' } }
    }
    if (table === 'ads') return { data: { ad_set_id: 'ad-set-1' } }
    if (
      table === 'ad_sets' &&
      columns.includes('ad_campaign_id') &&
      !columns.includes('targeting')
    ) {
      return { data: { ad_campaign_id: 'ad-campaign-1' } }
    }
    if (table === 'ad_sets') {
      return {
        data: {
          targeting: { geo_locations: { countries: ['US'] } },
          optimization_goal: 'LINK_CLICKS',
          ad_campaign_id: 'ad-campaign-1',
        },
      }
    }
    if (table === 'ad_campaigns') return { data: { metadata: { existing: true } } }
    if (table === 'user_integrations') {
      return {
        data: [
          {
            user_id: 'user-1',
            access_token: 'meta-token',
            metadata: { ad_accounts: [{ id: 'act_1' }] },
            scope_mode: 'personal',
            is_default: false,
            updated_at: '2026-06-19T06:00:00.000Z',
          },
        ],
      }
    }
    return { data: null }
  }

  const supabase = {
    from: vi.fn((table: string) => {
      let columns = ''
      let operation = 'select'
      const chain: any = {
        select: vi.fn((value: string) => {
          columns = value
          selects.push({ table, columns })
          return chain
        }),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        upsert: vi.fn((payload: Record<string, unknown>) => {
          operation = 'upsert'
          upserts.push({ table, payload })
          return chain
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          operation = 'update'
          updates.push({ table, payload })
          return chain
        }),
        single: vi.fn(async () => ({ ...resolveResult(table, columns, operation), error: null })),
        maybeSingle: vi.fn(async () => ({
          ...resolveResult(table, columns, operation),
          error: null,
        })),
        order: vi.fn(() => chain),
        then: (
          resolve: (value: { data: unknown; error: null }) => unknown,
          reject: (reason?: unknown) => unknown,
        ) =>
          Promise.resolve({ ...resolveResult(table, columns, operation), error: null }).then(
            resolve,
            reject,
          ),
      }
      return chain
    }),
  }

  return { selects, supabase, updates, upserts }
}

function makeTarget(supabase: unknown) {
  return {
    config: { get: vi.fn(() => 'http://api.test') },
    getAccessTokenFromSessionKey: vi.fn(async () => 'access-token'),
    getUserClient: vi.fn(async () => supabase),
    logger: { warn: vi.fn() },
    parseAgentIdFromSessionKey: vi.fn(() => 'copywriter'),
    resolveOrgId: vi.fn(() => null),
    resolveUserId: vi.fn(() => 'user-1'),
  }
}

describe('ArtifactLegacyStateMetaService data access behavior', () => {
  it('forwards the active organization to Meta API calls', async () => {
    const { supabase } = makeSupabase()
    const target = makeTarget(supabase)
    target.resolveOrgId.mockReturnValue('org-1')
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ success: true, connected: true }), { status: 200 }),
    ) as typeof fetch
    const service = new ArtifactLegacyStateMetaService()

    await service.checkMetaConnection(target, 'session-1')

    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.test/api/integrations/meta/status',
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-org-id': 'org-1' }),
      }),
    )
  })

  it('patches existing agent state and persists the updated content', async () => {
    const { supabase, upserts } = makeSupabase()
    const service = new ArtifactLegacyStateMetaService()

    const result = await service.patchState(
      makeTarget(supabase),
      { op: 'append_line', line: 'New line' },
      'session-1',
    )

    expect(result).toEqual({
      success: true,
      agent_id: 'copywriter',
      op: 'append_line',
      updated_at: '2026-06-19T06:00:00.000Z',
    })
    expect(upserts[0]).toEqual({
      table: 'user_agent_state',
      payload: expect.objectContaining({
        user_id: 'user-1',
        agent_id: 'copywriter',
        state_content: 'Existing state\nNew line\n',
      }),
    })
  })

  it('resolves a campaign from ad_id before publishing to Meta', async () => {
    const { supabase, updates } = makeSupabase()
    const service = new ArtifactLegacyStateMetaService()
    const metaCall = vi.spyOn(service, 'metaApiCall').mockResolvedValue({ success: true })

    const result = await service.publishAdToMeta(
      makeTarget(supabase),
      {
        ad_id: 'ad-1',
        ad_account_id: 'act_1',
        page_id: 'page-1',
        instagram_user_id: 'ig-1',
      },
      'session-1',
    )

    expect(result).toEqual({ success: true })
    expect(updates[0]).toEqual({
      table: 'ad_campaigns',
      payload: expect.objectContaining({
        meta_ad_account_id: 'act_1',
        meta_page_id: 'page-1',
        metadata: expect.objectContaining({
          existing: true,
          meta_ad_account_id: 'act_1',
          meta_page_id: 'page-1',
          meta_instagram_user_id: 'ig-1',
        }),
      }),
    })
    expect(metaCall).toHaveBeenCalledWith(
      expect.anything(),
      'POST',
      '/publish-campaign',
      'session-1',
      expect.objectContaining({ campaign_id: 'ad-campaign-1' }),
    )
  })

  it('saves Meta defaults into metadata and top-level campaign columns', async () => {
    const { supabase, updates } = makeSupabase()
    const service = new ArtifactLegacyStateMetaService()

    const result = await service.saveMetaDefaults(
      makeTarget(supabase),
      {
        campaign_id: 'ad-campaign-1',
        ad_account_id: 'act_1',
        page_id: 'page-1',
        instagram_user_id: 'ig-1',
        pixel_id: 'pixel-1',
      },
      'session-1',
    )

    expect(result).toEqual({
      success: true,
      saved: {
        ad_account_id: 'act_1',
        page_id: 'page-1',
        instagram_user_id: 'ig-1',
        pixel_id: 'pixel-1',
      },
    })
    expect(updates[0]?.payload).toEqual(
      expect.objectContaining({
        meta_ad_account_id: 'act_1',
        meta_page_id: 'page-1',
        metadata: expect.objectContaining({
          existing: true,
          meta_ad_account_id: 'act_1',
          meta_page_id: 'page-1',
          meta_instagram_user_id: 'ig-1',
          meta_pixel_id: 'pixel-1',
        }),
      }),
    )
  })

  it('loads ad set targeting and preferred Meta integration for delivery estimates', async () => {
    const { supabase } = makeSupabase()
    const service = new ArtifactLegacyStateMetaService()
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                estimate_mau_lower_bound: 100,
                estimate_mau_upper_bound: 200,
                estimate_dau: 20,
                estimate_ready: true,
                daily_outcomes_curve: [{ spend: 10 }],
              },
            ],
          }),
        ),
    ) as typeof fetch

    const result = await service.getDeliveryEstimate(
      makeTarget(supabase),
      { ad_set_id: 'ad-set-1' },
      'session-1',
    )

    expect(result).toEqual({
      success: true,
      estimate_mau_lower_bound: 100,
      estimate_mau_upper_bound: 200,
      estimate_dau: 20,
      estimate_ready: true,
      daily_outcomes_curve: [{ spend: 10 }],
    })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://graph.facebook.com/v25.0/act_1/delivery_estimate?'),
    )
  })
})
