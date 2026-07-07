import { describe, expect, it, vi } from 'vitest'
import { OrgSharingService } from '../org-sharing.service'

type QueryResult = {
  data: unknown
  error: { message: string } | null
}

function makeService(input: {
  brain: Record<string, unknown> | null
  target?: Record<string, unknown> | null
  share?: Record<string, unknown>
}) {
  const sharingRepository = {
    findBrainForShare: vi.fn().mockResolvedValue({ data: input.brain, error: null }),
    findActiveMemberForBrainShareTarget: vi
      .fn()
      .mockResolvedValue({ data: input.target ?? { id: 'member-1' }, error: null }),
    findAgentTeamForBrainShareTarget: vi
      .fn()
      .mockResolvedValue({ data: input.target ?? { id: 'team-1' }, error: null }),
    upsertBrainShare: vi.fn().mockResolvedValue({
      data: input.share ?? { id: 'share-1', brain_id: 'brain-1' },
      error: null,
    }),
  }
  const supabase = {}
  const service = new OrgSharingService(
    { client: {} } as never,
    undefined,
    sharingRepository as never,
  )
  return { service, supabase, sharingRepository }
}

describe('OrgSharingService.upsertCampaignPermission', () => {
  it('validates campaign ownership, upserts the permission, and syncs the member user', async () => {
    const serviceClient = {}
    const sharingRepository = {
      findCampaignForPermission: vi.fn().mockResolvedValue({
        data: { id: 'campaign-1', org_id: 'org-1', deleted_at: null },
        error: null,
      }),
      upsertCampaignPermission: vi.fn().mockResolvedValue({
        data: { id: 'permission-1', permission: 'edit' },
        error: null,
      }),
      findMemberUserId: vi.fn().mockResolvedValue('member-user-1'),
    }
    const gatewayService = { triggerFullSync: vi.fn().mockResolvedValue(true) }
    const service = new OrgSharingService(
      { client: serviceClient } as never,
      gatewayService as never,
      sharingRepository as never,
    )

    await expect(
      service.upsertCampaignPermission('org-1', 'member-1', 'campaign-1', 'edit', 'admin-1'),
    ).resolves.toMatchObject({ id: 'permission-1', permission: 'edit' })

    expect(sharingRepository.findCampaignForPermission).toHaveBeenCalledWith(
      serviceClient,
      'campaign-1',
    )
    expect(sharingRepository.upsertCampaignPermission).toHaveBeenCalledWith(
      serviceClient,
      'member-1',
      'campaign-1',
      'edit',
      'admin-1',
    )
    expect(sharingRepository.findMemberUserId).toHaveBeenCalledWith(serviceClient, 'member-1')
    expect(gatewayService.triggerFullSync).toHaveBeenCalledWith('member-user-1')
  })

  it('rejects deleted campaigns before upserting permissions', async () => {
    const sharingRepository = {
      findCampaignForPermission: vi.fn().mockResolvedValue({
        data: {
          id: 'campaign-1',
          org_id: 'org-1',
          deleted_at: '2026-06-01T00:00:00.000Z',
        },
        error: null,
      }),
      upsertCampaignPermission: vi.fn(),
    }
    const service = new OrgSharingService(
      { client: {} } as never,
      undefined,
      sharingRepository as never,
    )

    await expect(
      service.upsertCampaignPermission('org-1', 'member-1', 'campaign-1', 'edit', 'admin-1'),
    ).rejects.toThrow('Campaign not found')

    expect(sharingRepository.upsertCampaignPermission).not.toHaveBeenCalled()
  })
})

describe('OrgSharingService.upsertBrainPermission', () => {
  it('allows org-owned brains to be shared inside the org', async () => {
    const { service, supabase, sharingRepository } = makeService({
      brain: {
        id: 'brain-org',
        org_id: 'org-1',
        owner_id: 'owner-1',
        created_by: 'owner-1',
      },
    })

    await expect(
      service.upsertBrainPermission(supabase as never, 'org-1', 'brain-org', 'owner-1', {
        entity_type: 'user',
        entity_id: 'member-user-1',
        level: 'query',
      }),
    ).resolves.toMatchObject({ id: 'share-1' })

    expect(sharingRepository.upsertBrainShare).toHaveBeenCalledWith(supabase, {
      orgId: 'org-1',
      brainId: 'brain-org',
      entityType: 'user',
      entityId: 'member-user-1',
      level: 'query',
      createdBy: 'owner-1',
    })
  })

  it('allows personal brains to be intentionally shared into an org by their owner', async () => {
    const { service, supabase, sharingRepository } = makeService({
      brain: {
        id: 'brain-personal',
        org_id: null,
        owner_id: 'owner-1',
        created_by: 'owner-1',
      },
    })

    await expect(
      service.upsertBrainPermission(supabase as never, 'org-1', 'brain-personal', 'owner-1', {
        entity_type: 'user',
        entity_id: 'member-user-1',
        level: 'query',
      }),
    ).resolves.toMatchObject({ id: 'share-1' })

    expect(sharingRepository.upsertBrainShare).toHaveBeenCalledWith(supabase, {
      orgId: 'org-1',
      brainId: 'brain-personal',
      entityType: 'user',
      entityId: 'member-user-1',
      level: 'query',
      createdBy: 'owner-1',
    })
  })

  it('allows owned personal brains to be shared with the active org', async () => {
    const { service, supabase, sharingRepository } = makeService({
      brain: {
        id: 'brain-personal',
        org_id: null,
        owner_id: 'owner-1',
        created_by: 'owner-1',
      },
    })

    await expect(
      service.upsertBrainPermission(supabase as never, 'org-1', 'brain-personal', 'owner-1', {
        level: 'query',
      }),
    ).resolves.toMatchObject({ id: 'share-1' })

    expect(sharingRepository.upsertBrainShare).toHaveBeenCalledWith(supabase, {
      orgId: 'org-1',
      brainId: 'brain-personal',
      entityType: 'org',
      entityId: 'org-1',
      level: 'query',
      createdBy: 'owner-1',
    })
  })

  it('blocks personal brains when the sharing user is not the owner', async () => {
    const { service, supabase, sharingRepository } = makeService({
      brain: {
        id: 'brain-personal',
        org_id: null,
        owner_id: 'owner-1',
        created_by: 'owner-1',
      },
    })

    await expect(
      service.upsertBrainPermission(supabase as never, 'org-1', 'brain-personal', 'admin-1', {
        entity_type: 'user',
        entity_id: 'member-user-1',
        level: 'query',
      }),
    ).rejects.toThrow('Personal brain can only be shared by its owner')

    expect(sharingRepository.upsertBrainShare).not.toHaveBeenCalled()
  })
})
