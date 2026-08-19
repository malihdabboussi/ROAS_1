import { describe, expect, it, vi } from 'vitest'
import { BrainContextService } from './brain-context.service'
import { isGeneralCampaignRow, resolveCampaignBrainForPreload } from './campaign-brain-preload'

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
    expect(isGeneralCampaignRow({ name: 'general' })).toBe(true)
    expect(isGeneralCampaignRow({ name: 'Yasir', config: { is_general: true } })).toBe(true)
    expect(isGeneralCampaignRow({ name: 'Yasir', config: {} })).toBe(false)
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
})
