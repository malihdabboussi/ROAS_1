import { describe, expect, it, vi } from 'vitest'
import {
  extractNamedClientCandidates,
  maybeBindNamedClientCampaign,
} from './named-client-campaign-bind'

function makeQuery(rows: unknown[], onUpdate?: (values: unknown) => void) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    ilike: vi.fn(() => query),
    not: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    update: vi.fn((values: unknown) => {
      onUpdate?.(values)
      return query
    }),
    maybeSingle: vi.fn(async () => ({ data: rows[0] ?? null, error: null })),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: rows, error: null })),
  }
  return query
}

const OSGOOD = {
  id: 'camp-osgood',
  name: 'Christian Osgood / Multifamily Strategy',
  config: {},
  org_id: 'org-1',
}

function supabaseWith(input: {
  campaigns?: unknown[]
  campaignById?: Record<string, unknown>
  conversation?: unknown
}) {
  const updates: unknown[] = []
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') {
        return {
          ...makeQuery(input.campaigns ?? []),
          // maybeSingle path (lookup by id) returns campaignById entries
          maybeSingle: vi.fn(async () => ({
            data: Object.values(input.campaignById ?? {})[0] ?? OSGOOD,
            error: null,
          })),
        }
      }
      if (table === 'conversations')
        return makeQuery(input.conversation ? [input.conversation] : [], (v) => updates.push(v))
      return makeQuery([])
    }),
  }
  return { supabase, updates }
}

describe('extractNamedClientCandidates', () => {
  it('pulls the client from possessive and "for <client>" shapes', () => {
    expect(
      extractNamedClientCandidates(
        "Alright, so for Christian Osgood's multi-family strategy, take a look at his Slack channel",
      ),
    ).toContain('Christian Osgood')
    expect(extractNamedClientCandidates('write some ads')).toEqual([])
  })
})

describe('maybeBindNamedClientCampaign', () => {
  it('resolves a client whose campaign has a different name via Slack client stamps (Christian → Multifamily Strategy)', async () => {
    const updates: unknown[] = []
    const MULTIFAMILY = { id: 'camp-mfs', name: 'Multifamily Strategy', config: {}, org_id: 'org-1' }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') {
          const query = makeQuery([])
          // ilike scan finds nothing ("Christian" not in "Multifamily Strategy");
          // the by-id lookup after the stamp match returns the campaign.
          query.maybeSingle = vi.fn(async () => ({ data: MULTIFAMILY, error: null }))
          return query
        }
        if (table === 'slack_observation_events')
          return makeQuery([
            {
              metadata: {
                page_grader_client_name: 'Christian Osgood / Multifamily Strategy',
                roas_campaign_id: 'camp-mfs',
              },
            },
          ])
        if (table === 'conversations') return makeQuery([{ campaign_id: null }], (v) => updates.push(v))
        return makeQuery([])
      }),
    }
    const result = await maybeBindNamedClientCampaign(supabase as never, {
      conversationId: 'conv-1',
      userId: 'user-1',
      orgId: 'org-1',
      text: "for Christian Osgood's multi-family strategy, write video ad scripts",
      currentCampaignId: null,
    })
    expect(result).toMatchObject({ campaignId: 'camp-mfs' })
    expect(updates).toEqual([{ campaign_id: 'camp-mfs' }])
  })

  const base = { conversationId: 'conv-1', userId: 'user-1', orgId: 'org-1' }

  it("binds the Christian Osgood chat before the turn (screenshot case: unbound chat naming a client)", async () => {
    const { supabase, updates } = supabaseWith({
      campaigns: [OSGOOD],
      conversation: { campaign_id: null },
    })
    const result = await maybeBindNamedClientCampaign(supabase as never, {
      ...base,
      text: "Alright, so for Christian Osgood's multi-family strategy, if you take a look at his Slack channel, you'll see that he requested some ad creatives for his book funnel.",
      currentCampaignId: null,
    })
    expect(result).toMatchObject({ campaignId: 'camp-osgood', candidate: 'Christian Osgood' })
    expect(updates).toEqual([{ campaign_id: 'camp-osgood' }])
  })

  it('never rebinds a chat already on a real client campaign', async () => {
    const { supabase, updates } = supabaseWith({
      campaigns: [OSGOOD],
      campaignById: { current: { id: 'camp-yasir', name: 'Yasir Khan Coaching LTD', config: {}, org_id: 'org-1' } },
    })
    const result = await maybeBindNamedClientCampaign(supabase as never, {
      ...base,
      text: "what about Christian Osgood's funnel?",
      currentCampaignId: 'camp-yasir',
    })
    expect(result).toBeNull()
    expect(updates).toEqual([])
  })

  it('skips ambiguous matches, missing org, and no-name messages', async () => {
    const ambiguous = supabaseWith({
      campaigns: [OSGOOD, { id: 'camp-2', name: 'Christian Osgood II', config: {}, org_id: 'org-1' }],
      conversation: { campaign_id: null },
    })
    expect(
      await maybeBindNamedClientCampaign(ambiguous.supabase as never, {
        ...base,
        text: "Christian Osgood's ads",
        currentCampaignId: null,
      }),
    ).toBeNull()
    expect(
      await maybeBindNamedClientCampaign(ambiguous.supabase as never, {
        ...base,
        orgId: null,
        text: "Christian Osgood's ads",
        currentCampaignId: null,
      }),
    ).toBeNull()
    expect(
      await maybeBindNamedClientCampaign(ambiguous.supabase as never, {
        ...base,
        text: 'remind me to stretch',
        currentCampaignId: null,
      }),
    ).toBeNull()
  })
})
