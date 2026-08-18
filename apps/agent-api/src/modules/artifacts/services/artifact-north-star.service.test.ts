import { describe, expect, it, vi } from 'vitest'
import { ArtifactNorthStarService } from './artifact-north-star.service'

describe('ArtifactNorthStarService list_campaigns relevance', () => {
  const campaigns = [
    { id: 'campaign-owned', name: 'Owned Campaign', user_id: 'user-1', permission: 'owner' },
    { id: 'campaign-viewer', name: 'Viewer Campaign', user_id: 'user-2', permission: 'viewer' },
  ]

  function target() {
    return {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      parseAgentIdFromSessionKey: vi.fn(() => 'vibey'),
      mainApiCall: vi.fn(async () => campaigns),
    }
  }

  it('returns only strongly relevant campaigns in default relevant mode', async () => {
    const service = new ArtifactNorthStarService()
    const t = target()

    const result = (await service.getHandlers(t).list_campaigns({}, 'agent:vibey:stub')) as Record<
      string,
      any
    >

    expect(result).toMatchObject({
      mode: 'relevant',
      campaigns: [
        {
          id: 'campaign-owned',
          context_relevance: { relationship: 'owner', confidence: 'strong' },
        },
      ],
      supporting_campaigns: [],
      shared_candidates: [
        {
          id: 'campaign-viewer',
          context_relevance: { relationship: 'org_viewer', confidence: 'weak' },
        },
      ],
    })
  })

  it('returns every accessible campaign with relationship metadata in accessible mode', async () => {
    const service = new ArtifactNorthStarService()
    const t = target()

    const result = (await service
      .getHandlers(t)
      .list_campaigns({ mode: 'accessible' }, 'agent:vibey:stub')) as Record<string, any>

    expect(result).toMatchObject({
      mode: 'accessible',
      campaigns: [
        {
          id: 'campaign-owned',
          context_relevance: { confidence: 'strong' },
        },
        {
          id: 'campaign-viewer',
          context_relevance: { confidence: 'weak' },
        },
      ],
      supporting_campaigns: [],
      shared_candidates: [],
    })
  })
})

describe('ArtifactNorthStarService create_campaign', () => {
  it('returns a portal campaign url with the created campaign', async () => {
    const service = new ArtifactNorthStarService()
    const created = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Master Your Kraft | VSL Retargeting',
      status: 'draft',
    }
    const target = {
      mainApiCall: vi.fn(async () => created),
    }

    const result = await service
      .getHandlers(target)
      .create_campaign({ name: 'Master Your Kraft | VSL Retargeting' }, 'agent:vibey:stub')

    expect(target.mainApiCall).toHaveBeenCalledWith('POST', '/api/campaigns', 'agent:vibey:stub', {
      name: 'Master Your Kraft | VSL Retargeting',
    })
    expect(result).toMatchObject({
      ...created,
      url: 'https://app.roas.io/campaigns/11111111-1111-4111-8111-111111111111',
    })
  })
})
