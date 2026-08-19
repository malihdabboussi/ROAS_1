import { describe, expect, it, vi } from 'vitest'
import { resolveQcConnectionOrg } from '../page-grader-qc-connection-org'

function makeQuery(single: unknown, list: unknown[] = []) {
  const query: any = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    not: vi.fn(() => query),
    eq: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: single, error: null })),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: list, error: null })),
  }
  return query
}

describe('resolveQcConnectionOrg', () => {
  it('keeps the connection org when present', async () => {
    const supabase = { from: vi.fn() }
    await expect(
      resolveQcConnectionOrg(
        supabase as never,
        { userId: 'u', orgId: 'org-1' },
        { campaignIds: [] },
      ),
    ).resolves.toEqual({ orgId: 'org-1', via: 'connection' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('falls back to the finding campaign org, then a single active membership', async () => {
    const viaCampaign = {
      from: vi.fn((table: string) =>
        table === 'campaigns' ? makeQuery({ org_id: 'org-c' }) : makeQuery(null),
      ),
    }
    await expect(
      resolveQcConnectionOrg(
        viaCampaign as never,
        { userId: 'u', orgId: null },
        { campaignIds: ['camp-1', null] },
      ),
    ).resolves.toEqual({ orgId: 'org-c', via: 'campaign' })

    const viaMembership = {
      from: vi.fn((table: string) =>
        table === 'org_members' ? makeQuery(null, [{ org_id: 'org-m' }]) : makeQuery(null),
      ),
    }
    await expect(
      resolveQcConnectionOrg(
        viaMembership as never,
        { userId: 'u', orgId: null },
        { campaignIds: [] },
      ),
    ).resolves.toEqual({ orgId: 'org-m', via: 'membership' })

    const ambiguous = {
      from: vi.fn((table: string) =>
        table === 'org_members'
          ? makeQuery(null, [{ org_id: 'org-a' }, { org_id: 'org-b' }])
          : makeQuery(null),
      ),
    }
    await expect(
      resolveQcConnectionOrg(ambiguous as never, { userId: 'u', orgId: null }, { campaignIds: [] }),
    ).resolves.toEqual({ orgId: null, via: 'none' })
  })
})
