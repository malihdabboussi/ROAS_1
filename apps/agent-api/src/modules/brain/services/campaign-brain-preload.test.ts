import { describe, expect, it, vi } from 'vitest'
import { BrainContextService } from './brain-context.service'
import {
  campaignBrainHeading,
  isGeneralCampaignRow,
  resolveCampaignBrainForPreload,
  resolveCampaignBrainLaneTargets,
} from './campaign-brain-preload'

function makeQuery(result: unknown) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: result, error: null })),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: result, error: null })),
  }
  return query
}

const YASIR = 'bad92814-a1cb-4b66-ba92-66dd02dc42e1'

function supabaseWith(rows: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => makeQuery(table in rows ? rows[table] : null)),
  }
}

describe('resolveCampaignBrainForPreload', () => {
  it('returns the campaign brain for a real client campaign', async () => {
    const supabase = supabaseWith({
      campaigns: { id: YASIR, name: 'Yasir Khan Coaching LTD', config: {}, org_id: 'org-1' },
      ns_brains: { id: 'brain-yasir' },
    })
    await expect(
      resolveCampaignBrainForPreload(supabase as never, { campaignId: YASIR, orgId: 'org-1' }),
    ).resolves.toEqual({
      brainId: 'brain-yasir',
      campaignId: YASIR,
      campaignName: 'Yasir Khan Coaching LTD',
    })
  })

  it('never preloads General, another org, or a campaign without a brain', async () => {
    const general = supabaseWith({
      campaigns: { id: 'g', name: 'General', config: { system_kind: 'general' }, org_id: 'org-1' },
      ns_brains: { id: 'brain-general' },
    })
    await expect(
      resolveCampaignBrainForPreload(general as never, { campaignId: 'g', orgId: 'org-1' }),
    ).resolves.toBeNull()
    const wrongOrg = supabaseWith({
      campaigns: { id: YASIR, name: 'Yasir', config: {}, org_id: 'org-2' },
      ns_brains: { id: 'brain-yasir' },
    })
    await expect(
      resolveCampaignBrainForPreload(wrongOrg as never, { campaignId: YASIR, orgId: 'org-1' }),
    ).resolves.toBeNull()
    const noBrain = supabaseWith({
      campaigns: { id: YASIR, name: 'Yasir', config: {}, org_id: 'org-1' },
    })
    await expect(
      resolveCampaignBrainForPreload(noBrain as never, { campaignId: YASIR, orgId: 'org-1' }),
    ).resolves.toBeNull()
    expect(isGeneralCampaignRow({ name: 'general' })).toBe(false)
    expect(isGeneralCampaignRow({ name: 'General', config: { system_kind: 'general' } })).toBe(true)
    expect(isGeneralCampaignRow({ name: 'Yasir', config: { is_general: true } })).toBe(true)
    expect(isGeneralCampaignRow({ name: 'Yasir', config: {} })).toBe(false)
  })

  it('preloads a client campaign that is named General', async () => {
    const supabase = supabaseWith({
      campaigns: { id: 'above-it', name: 'General', config: {}, org_id: 'org-1' },
      ns_brains: { id: 'brain-above' },
    })
    await expect(
      resolveCampaignBrainForPreload(supabase as never, {
        campaignId: 'above-it',
        orgId: 'org-1',
      }),
    ).resolves.toEqual({
      brainId: 'brain-above',
      campaignId: 'above-it',
      campaignName: 'General',
    })
  })
})

describe('buildFullContext campaign lane (§11.2)', () => {
  function harness(campaignRow: Record<string, unknown> | null) {
    const search = vi.fn(async (input: { family: string; brainId?: string; query: string }) => ({
      success: true,
      query: input.query,
      family: input.family,
      count: 1,
      context_sufficient: true,
      sufficiency: {
        sufficient: true,
        confidence: 1,
        reason: '',
        missing: [],
        suggested_next_queries: [],
      },
      missing: [],
      suggested_next_queries: [],
      results: [
        {
          id: `hit-${input.brainId ?? input.family}`,
          kind: 'memory',
          title: input.brainId === 'brain-yasir' ? 'Aug 6 webinar: 412 registrants' : 'Hit',
          snippet: 'Snippet',
          related: [],
        },
      ],
    }))
    const retrieval = { search, resolveUserBrainId: vi.fn(async () => 'brain-user') }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_addons') return makeQuery({ brain_id: 'brain-vibey' })
        if (table === 'campaigns') return makeQuery(campaignRow)
        if (table === 'ns_brains') return makeQuery({ id: 'brain-yasir' })
        return makeQuery(null)
      }),
    }
    const service = new BrainContextService(
      { client: supabase } as any,
      { getEmbedding: vi.fn(async () => [0.1]) } as any,
      { buildSpotlightContext: vi.fn(), buildBrainSpotlightContext: vi.fn() } as any,
      { buildCompanyContext: vi.fn(async () => '') } as any,
      { canAgentUseCapability: vi.fn(async () => true) } as any,
      retrieval as any,
    )
    return { service, search }
  }

  it('preloads the bound client Campaign Brain ahead of the User Brain', async () => {
    const { service, search } = harness({
      id: YASIR,
      name: 'Yasir Khan Coaching LTD',
      config: {},
      org_id: 'org-1',
    })
    const context = await service.buildFullContext(
      'user-1',
      'vibey',
      'what were their last webinar stats',
      'org-1',
      false,
      true,
      false,
      YASIR,
    )
    const campaignCall = search.mock.calls.find((call) => call[0].brainId === 'brain-yasir')?.[0]
    expect(campaignCall).toMatchObject({ family: 'user', brainId: 'brain-yasir', limit: 20 })
    expect(context).toContain('CAMPAIGN BRAIN (Yasir Khan Coaching LTD) — Retrieved Context:')
    expect(context.indexOf('CAMPAIGN BRAIN')).toBeLessThan(context.indexOf('USER BRAIN'))
    expect(context).toContain('Aug 6 webinar: 412 registrants')
  })

  it('adds no campaign lane for General or when no campaign is bound', async () => {
    const { service, search } = harness({
      id: 'g',
      name: 'General',
      config: { system_kind: 'general' },
      org_id: 'org-1',
    })
    const general = await service.buildFullContext(
      'user-1',
      'vibey',
      'q',
      'org-1',
      false,
      true,
      false,
      'g',
    )
    expect(general).not.toContain('CAMPAIGN BRAIN')
    expect(search.mock.calls.some((call) => call[0].brainId === 'brain-yasir')).toBe(false)
    const unbound = await service.buildFullContext('user-1', 'vibey', 'q', 'org-1', false, true)
    expect(unbound).not.toContain('CAMPAIGN BRAIN')
  })

  it('preloads extra campaign brains with their own headings', async () => {
    const MULTI = 'af082417-0000-0000-0000-000000000001'
    let lastId: string | null = null
    const supabase = {
      from: vi.fn((table: string) => {
        const query: any = {
          select: vi.fn(() => query),
          eq: vi.fn((column: string, value: string) => {
            if (column === 'id' || column === 'campaign_id') lastId = value
            return query
          }),
          is: vi.fn(() => query),
          maybeSingle: vi.fn(async () => {
            if (lastId === 'skipped-empty') return { data: null, error: null }
            if (table === 'campaigns') {
              const name = lastId === YASIR ? 'Yasir Khan Coaching LTD' : 'Multifamily Strategy'
              return {
                data: { id: lastId, name, config: {}, org_id: 'org-1' },
                error: null,
              }
            }
            if (table === 'ns_brains') {
              return {
                data: { id: lastId === YASIR ? 'brain-yasir' : 'brain-multi' },
                error: null,
              }
            }
            return { data: null, error: null }
          }),
        }
        return query
      }),
    }
    const lanes = await resolveCampaignBrainLaneTargets(supabase as never, {
      campaignId: YASIR,
      extraCampaignIds: [MULTI, MULTI, 'skipped-empty'],
      orgId: 'org-1',
    })
    expect(lanes.primary).toMatchObject({
      brainId: 'brain-yasir',
      campaignId: YASIR,
      campaignName: 'Yasir Khan Coaching LTD',
    })
    expect(lanes.extras).toEqual([
      {
        brainId: 'brain-multi',
        campaignId: MULTI,
        campaignName: 'Multifamily Strategy',
      },
    ])
    expect(campaignBrainHeading(lanes.extras[0]!)).toBe(
      'CAMPAIGN BRAIN (Multifamily Strategy) — Retrieved Context:',
    )
  })

  it('preloads extra campaign brains into buildFullContext under their own headings', async () => {
    const MULTI = 'af082417-0000-0000-0000-000000000001'
    let lastId: string | null = null
    const search = vi.fn(async (input: { family: string; brainId?: string; query: string }) => ({
      success: true,
      query: input.query,
      family: input.family,
      count: 1,
      context_sufficient: true,
      sufficiency: {
        sufficient: true,
        confidence: 1,
        reason: '',
        missing: [],
        suggested_next_queries: [],
      },
      missing: [],
      suggested_next_queries: [],
      results: [
        { id: `hit-${input.brainId}`, kind: 'memory', title: 'Hit', snippet: 'S', related: [] },
      ],
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        const query: any = {
          select: vi.fn(() => query),
          eq: vi.fn((column: string, value: string) => {
            if (column === 'id' || column === 'campaign_id') lastId = value
            return query
          }),
          is: vi.fn(() => query),
          maybeSingle: vi.fn(async () => {
            if (table === 'campaigns') {
              const name = lastId === YASIR ? 'Yasir Khan Coaching LTD' : 'Multifamily Strategy'
              return { data: { id: lastId, name, config: {}, org_id: 'org-1' }, error: null }
            }
            if (table === 'ns_brains') {
              return {
                data: { id: lastId === YASIR ? 'brain-yasir' : 'brain-multi' },
                error: null,
              }
            }
            return { data: null, error: null }
          }),
        }
        return query
      }),
    }
    const service = new BrainContextService(
      { client: supabase } as any,
      { getEmbedding: vi.fn(async () => [0.1]) } as any,
      { buildSpotlightContext: vi.fn(), buildBrainSpotlightContext: vi.fn() } as any,
      { buildCompanyContext: vi.fn(async () => '') } as any,
      { canAgentUseCapability: vi.fn(async () => true) } as any,
      { search, resolveUserBrainId: vi.fn(async () => 'brain-user') } as any,
    )
    const context = await service.buildFullContext(
      'user-1',
      'vibey',
      'what were their last webinar stats',
      'org-1',
      false,
      true,
      false,
      YASIR,
      { extraCampaignIds: [MULTI] },
    )
    expect(context).toContain('CAMPAIGN BRAIN (Yasir Khan Coaching LTD) — Retrieved Context:')
    expect(context).toContain('CAMPAIGN BRAIN (Multifamily Strategy) — Retrieved Context:')
    expect(search.mock.calls.some((call) => call[0].brainId === 'brain-multi')).toBe(true)
  })
})
