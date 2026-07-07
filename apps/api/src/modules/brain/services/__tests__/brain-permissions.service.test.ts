import { describe, expect, it, vi } from 'vitest'
import { BrainPermissionsService, type BrainAccessRow } from '../brain-permissions.service'

const supabase = {} as any

function makeService(input: {
  brain: BrainAccessRow
  shares?: Array<{
    entity_type: 'user' | 'org' | 'team'
    entity_id: string
    level: 'view' | 'query' | 'train'
  }>
  teams?: string[]
}) {
  const service = new BrainPermissionsService()
  vi.spyOn(service, 'loadBrain').mockResolvedValue(input.brain)
  vi.spyOn(service as any, 'loadShares').mockResolvedValue(
    (input.shares ?? []).map((share, index) => ({
      id: `share-${index}`,
      brain_id: input.brain.id,
      org_id: input.brain.org_id,
      created_by: 'admin',
      created_at: '2026-05-20T00:00:00Z',
      ...share,
    })),
  )
  vi.spyOn(service as any, 'loadTeamIds').mockResolvedValue(new Set(input.teams ?? []))
  return service
}

describe('BrainPermissionsService', () => {
  it('lets editors query org customer brains but not train them', async () => {
    const service = makeService({
      brain: {
        id: 'brain-customer',
        owner_id: 'owner',
        org_id: 'org-1',
        scope: 'customer',
        agent_id: null,
        created_by: 'owner',
      },
    })

    await expect(
      service.resolveEffectiveBrainLevel(
        supabase,
        'editor',
        {
          orgId: 'org-1',
          orgRole: 'editor',
        },
        'brain-customer',
      ),
    ).resolves.toBe('query')

    await expect(
      service.assertCanTrainBrain(
        supabase,
        'editor',
        {
          orgId: 'org-1',
          orgRole: 'editor',
        },
        'brain-customer',
      ),
    ).rejects.toThrow('Insufficient brain permissions')
  })

  it('lets the creator train their org agent brain', async () => {
    const service = makeService({
      brain: {
        id: 'brain-agent',
        owner_id: 'owner',
        org_id: 'org-1',
        scope: 'agent',
        agent_id: 'jack_agent',
        created_by: 'jack',
      },
    })

    await expect(
      service.resolveEffectiveBrainLevel(
        supabase,
        'jack',
        {
          orgId: 'org-1',
          orgRole: 'editor',
        },
        'brain-agent',
      ),
    ).resolves.toBe('train')
  })

  it('lets team train shares train the shared brain', async () => {
    const service = makeService({
      brain: {
        id: 'brain-agent',
        owner_id: 'owner',
        org_id: 'org-1',
        scope: 'agent',
        agent_id: 'jack_agent',
        created_by: 'jack',
      },
      shares: [{ entity_type: 'team', entity_id: 'team-1', level: 'train' }],
      teams: ['team-1'],
    })

    await expect(
      service.resolveEffectiveBrainLevel(
        supabase,
        'adrian',
        {
          orgId: 'org-1',
          orgRole: 'editor',
        },
        'brain-agent',
      ),
    ).resolves.toBe('train')
  })

  it('returns the access source for direct user query shares', async () => {
    const service = makeService({
      brain: {
        id: 'brain-shared-user',
        owner_id: 'owner',
        org_id: 'org-1',
        scope: 'user',
        agent_id: null,
        created_by: 'owner',
      },
      shares: [{ entity_type: 'user', entity_id: 'teammate', level: 'query' }],
    })

    await expect(
      service.resolveEffectiveBrainAccess(
        supabase,
        'teammate',
        {
          orgId: 'org-1',
          orgRole: 'editor',
        },
        'brain-shared-user',
      ),
    ).resolves.toMatchObject({
      id: 'brain-shared-user',
      effective_level: 'query',
      access_source: 'user_share',
    })
  })

  it('returns org share access for non-owner shared user brains', async () => {
    const service = makeService({
      brain: {
        id: 'brain-shared-org',
        owner_id: 'owner',
        org_id: 'org-1',
        scope: 'user',
        agent_id: null,
        created_by: 'owner',
      },
      shares: [{ entity_type: 'org', entity_id: 'org-1', level: 'query' }],
    })

    await expect(
      service.resolveEffectiveBrainAccess(
        supabase,
        'teammate',
        {
          orgId: 'org-1',
          orgRole: 'editor',
        },
        'brain-shared-org',
      ),
    ).resolves.toMatchObject({
      effective_level: 'query',
      access_source: 'org_share',
    })
  })

  it('denies viewers even when an org brain exists', async () => {
    const service = makeService({
      brain: {
        id: 'brain-agent',
        owner_id: 'owner',
        org_id: 'org-1',
        scope: 'agent',
        agent_id: 'jack_agent',
        created_by: 'jack',
      },
    })

    await expect(
      service.resolveEffectiveBrainLevel(
        supabase,
        'viewer',
        {
          orgId: 'org-1',
          orgRole: 'viewer',
        },
        'brain-agent',
      ),
    ).resolves.toBeNull()
  })
})
