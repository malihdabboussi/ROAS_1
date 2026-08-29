import { describe, expect, it, vi } from 'vitest'
import { ArtifactLegacySessionCampaignRepository } from './artifact-legacy-session-campaign.repository'

function makeClient() {
  const query: Record<string, any> = {}
  for (const method of ['select', 'neq', 'ilike', 'order', 'limit', 'eq', 'is']) {
    query[method] = vi.fn(() => query)
  }
  query.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data: [], error: null }))
  return { client: { from: vi.fn(() => query) } as never, query }
}

describe('ArtifactLegacySessionCampaignRepository campaign name scope', () => {
  it('keeps user-owned organization campaigns readable when runtime org context is absent', async () => {
    const repository = new ArtifactLegacySessionCampaignRepository()
    const exact = makeClient()
    const list = makeClient()

    await repository.findCampaignNameMatches(exact.client, {
      campaignName: 'Multifamily Strategy',
      ilikeValue: 'Multifamily Strategy',
      userId: 'user-1',
      orgId: null,
    })
    await repository.listAccessibleCampaignNames(list.client, {
      userId: 'user-1',
      orgId: null,
    })

    expect(exact.query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(list.query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(exact.query.is).not.toHaveBeenCalled()
    expect(list.query.is).not.toHaveBeenCalled()
  })

  it('preserves explicit organization scoping when runtime org context is present', async () => {
    const repository = new ArtifactLegacySessionCampaignRepository()
    const exact = makeClient()
    const list = makeClient()

    await repository.findCampaignNameMatches(exact.client, {
      campaignName: 'Multifamily Strategy',
      ilikeValue: 'Multifamily Strategy',
      userId: 'user-1',
      orgId: 'org-1',
    })
    await repository.listAccessibleCampaignNames(list.client, {
      userId: 'user-1',
      orgId: 'org-1',
    })

    expect(exact.query.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(list.query.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(exact.query.eq).not.toHaveBeenCalledWith('user_id', expect.anything())
    expect(list.query.eq).not.toHaveBeenCalledWith('user_id', expect.anything())
  })
})
