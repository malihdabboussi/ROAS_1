import { describe, expect, it, vi } from 'vitest'
import { ensureMeetingsSpaceForScope } from '../meetings-space-bootstrap'

const supabase = {} as never

describe('ensureMeetingsSpaceForScope', () => {
  it('reuses the existing Meetings space when one resolves', async () => {
    const instantiate = vi.fn()
    await expect(
      ensureMeetingsSpaceForScope({
        supabase,
        scope: { userId: 'user_1', orgId: 'org_1' } as never,
        resolveMeetingsSpaceId: vi.fn().mockResolvedValue('space_existing'),
        instantiate,
        findCampaignId: vi.fn().mockResolvedValue('camp_1'),
      }),
    ).resolves.toEqual({ id: 'space_existing', action: 'reuse' })
    expect(instantiate).not.toHaveBeenCalled()
  })

  it('creates an org Meetings space on the General campaign in org context', async () => {
    const instantiate = vi.fn().mockResolvedValue({ id: 'space_new' })
    const findCampaignId = vi.fn().mockResolvedValue('camp_general')
    await expect(
      ensureMeetingsSpaceForScope({
        supabase,
        scope: { userId: 'user_1', orgId: 'org_1', orgRole: 'admin' } as never,
        resolveMeetingsSpaceId: vi.fn().mockResolvedValue(null),
        instantiate,
        findCampaignId,
      }),
    ).resolves.toEqual({ id: 'space_new', action: 'create' })
    expect(findCampaignId).toHaveBeenCalledWith(supabase, 'user_1', 'org_1')
    expect(instantiate).toHaveBeenCalledWith(
      supabase,
      { userId: 'user_1', orgId: 'org_1', orgRole: 'admin' },
      'personal-dashboard',
      expect.objectContaining({
        title: 'Meetings',
        visibility: 'team',
        campaign_id: 'camp_general',
      }),
    )
  })

  it('creates a private Personal Dashboard outside an org and drops the org role', async () => {
    const instantiate = vi.fn().mockResolvedValue({ id: 'space_personal' })
    await ensureMeetingsSpaceForScope({
      supabase,
      scope: { userId: 'user_1', orgId: null, orgRole: 'admin' } as never,
      resolveMeetingsSpaceId: vi.fn().mockResolvedValue(null),
      instantiate,
      findCampaignId: vi.fn().mockResolvedValue(null),
    })
    expect(instantiate).toHaveBeenCalledWith(
      supabase,
      { userId: 'user_1', orgId: null, orgRole: null },
      'personal-dashboard',
      expect.objectContaining({ title: 'Personal Dashboard', visibility: 'private' }),
    )
    expect(instantiate.mock.calls[0]![3]).not.toHaveProperty('campaign_id')
  })

  it('fails loudly when the template returns no space', async () => {
    await expect(
      ensureMeetingsSpaceForScope({
        supabase,
        scope: { userId: 'user_1', orgId: null } as never,
        resolveMeetingsSpaceId: vi.fn().mockResolvedValue(null),
        instantiate: vi.fn().mockResolvedValue({}),
        findCampaignId: vi.fn().mockResolvedValue(null),
      }),
    ).rejects.toThrow(/did not return a Space/)
  })
})
