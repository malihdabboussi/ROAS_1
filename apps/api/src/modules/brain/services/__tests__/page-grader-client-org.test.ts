import { describe, expect, it, vi } from 'vitest'
import {
  attachPageGraderCampaignToOrg,
  ensurePageGraderCampaignInClientsProgram,
  findPageGraderCampaignForClient,
  resolveClientsProgramId,
  resolvePageGraderImportOrg,
} from '../page-grader-client-org'

function createQuery(options: { maybeSingle?: unknown; list?: unknown[] } = {}) {
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    not: vi.fn(() => query),
    in: vi.fn(() => query),
    contains: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: options.maybeSingle ?? null, error: null })),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: options.list ?? [], error: null })),
  }
  return query
}

describe('page-grader-client-org', () => {
  it('resolves a personal Page Grader connection to the operator’s single org', async () => {
    const membersQuery = createQuery({ list: [{ org_id: 'org-roas' }] })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'org_members') return membersQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    await expect(resolvePageGraderImportOrg(supabase as never, 'user-1', null)).resolves.toBe(
      'org-roas',
    )
  })

  it('attaches a personal campaign, Spaces, and Brain to the org', async () => {
    const campaignQuery = createQuery()
    const spaceQuery = createQuery()
    const brainQuery = createQuery()
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') return campaignQuery
        if (table === 'spaces') return spaceQuery
        if (table === 'ns_brains') return brainQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    await attachPageGraderCampaignToOrg(supabase as never, 'campaign-1', 'org-roas')

    expect(campaignQuery.update).toHaveBeenCalledWith({ org_id: 'org-roas' })
    expect(spaceQuery.update).toHaveBeenCalledWith({ org_id: 'org-roas', visibility: 'team' })
    expect(brainQuery.update).toHaveBeenCalledWith({ org_id: 'org-roas' })
  })

  it('prefers an existing org campaign, then a personal campaign for the same Portal client', async () => {
    const orgQuery = createQuery({
      maybeSingle: { id: 'org-campaign', org_id: 'org-roas' },
    })
    const supabase = { from: vi.fn(() => orgQuery) }

    const found = await findPageGraderCampaignForClient(supabase as never, {
      userId: 'user-1',
      orgId: 'org-roas',
      pageGraderClientId: 'pg-1',
      uniqueClientId: 'claude-club-975',
    })

    expect(found).toMatchObject({ id: 'org-campaign', org_id: 'org-roas' })
    expect(orgQuery.eq).toHaveBeenCalledWith('org_id', 'org-roas')
  })

  it('assigns a Portal campaign with no program_id to the org Clients program', async () => {
    const programQuery = createQuery({ maybeSingle: { id: 'program-clients' } })
    const campaignQuery = createQuery()
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'campaigns') return campaignQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    await expect(resolveClientsProgramId(supabase as never, 'org-roas')).resolves.toBe(
      'program-clients',
    )
    await ensurePageGraderCampaignInClientsProgram(supabase as never, 'campaign-1', 'org-roas')
    expect(campaignQuery.update).toHaveBeenCalledWith({ program_id: 'program-clients' })
    expect(campaignQuery.is).toHaveBeenCalledWith('program_id', null)
  })
})
