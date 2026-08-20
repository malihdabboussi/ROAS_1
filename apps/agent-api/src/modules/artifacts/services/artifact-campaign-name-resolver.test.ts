import { describe, expect, it, vi } from 'vitest'
import { resolveCampaignIdByName } from './artifact-campaign-name-resolver'

function makeRepository(accessible: Array<{ id: string; name: string }>) {
  return {
    findCampaignNameMatches: vi.fn(async () => ({ data: [], error: null })),
    listAccessibleCampaignNames: vi.fn(async () => ({ data: accessible, error: null })),
  } as never
}

function makeSupabase(stampRows: Array<{ metadata: Record<string, unknown> }>) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    ilike: vi.fn(() => query),
    not: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: stampRows, error: null })),
  }
  return { from: vi.fn(() => query) } as never
}

describe('resolveCampaignIdByName client-stamp fallback', () => {
  it('resolves a client whose campaign has a different name (Christian Osgood → Multifamily Strategy)', async () => {
    const repository = makeRepository([{ id: 'camp-mfs', name: 'Multifamily Strategy' }])
    const supabase = makeSupabase([
      {
        metadata: {
          page_grader_client_name: 'Christian Osgood / Multifamily Strategy',
          roas_campaign_id: 'camp-mfs',
        },
      },
    ])
    await expect(
      resolveCampaignIdByName(repository, supabase, 'user-1', 'Christian Osgood', 'org-1'),
    ).resolves.toBe('camp-mfs')
  })

  it('still throws not-found when stamps are absent, ambiguous, or there is no org', async () => {
    const repository = makeRepository([{ id: 'camp-mfs', name: 'Multifamily Strategy' }])
    await expect(
      resolveCampaignIdByName(repository, makeSupabase([]), 'user-1', 'Nobody', 'org-1'),
    ).rejects.toThrow('campaign_name not found')
    const ambiguous = makeSupabase([
      { metadata: { page_grader_client_name: 'Andy One', roas_campaign_id: 'c-1' } },
      { metadata: { page_grader_client_name: 'Andy Two', roas_campaign_id: 'c-2' } },
    ])
    await expect(
      resolveCampaignIdByName(repository, ambiguous, 'user-1', 'Andy', 'org-1'),
    ).rejects.toThrow('campaign_name not found')
    await expect(
      resolveCampaignIdByName(repository, makeSupabase([]), 'user-1', 'Christian Osgood', null),
    ).rejects.toThrow('campaign_name not found')
  })
})
