import { describe, expect, it, vi } from 'vitest'
import { OrgPersonCalendarIdentitiesService } from '../org-person-calendar-identities.service'

describe('OrgPersonCalendarIdentitiesService', () => {
  it('confirms suggested links onto durable columns', async () => {
    const identitiesRepo = {
      normalizeEmail: (email: string) => email.trim().toLowerCase(),
      findById: vi.fn().mockResolvedValue({
        id: 'id-1',
        source: 'directory_sync',
        google_workspace_user_id: 'g-1',
        match_status: 'suggested',
        match_method: 'email_exact',
        channel_member_id: null,
        vibey_user_id: null,
        person_brain_id: null,
        suggested_channel_member_id: 'cm-1',
        suggested_vibey_user_id: 'user-1',
        suggested_person_brain_id: 'brain-1',
      }),
      update: vi.fn().mockImplementation(async (_sb, _org, _id, patch) => ({
        id: 'id-1',
        ...patch,
      })),
    }
    const service = new OrgPersonCalendarIdentitiesService(identitiesRepo as never, {} as never)
    const result = await service.confirm({} as never, 'org-1', 'id-1')
    expect(identitiesRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      'org-1',
      'id-1',
      expect.objectContaining({
        channel_member_id: 'cm-1',
        vibey_user_id: 'user-1',
        person_brain_id: 'brain-1',
        match_status: 'confirmed',
        suggested_channel_member_id: null,
      }),
    )
    expect(result.match_status).toBe('confirmed')
  })

  it('confirms unmatched directory rows without suggested links', async () => {
    const identitiesRepo = {
      normalizeEmail: (email: string) => email.trim().toLowerCase(),
      findById: vi.fn().mockResolvedValue({
        id: 'id-2',
        source: 'directory_sync',
        google_workspace_user_id: 'g-2',
        match_status: 'unmatched',
        match_method: null,
        channel_member_id: null,
        vibey_user_id: null,
        person_brain_id: null,
        suggested_channel_member_id: null,
        suggested_vibey_user_id: null,
        suggested_person_brain_id: null,
      }),
      update: vi.fn().mockImplementation(async (_sb, _org, _id, patch) => ({
        id: 'id-2',
        ...patch,
      })),
    }
    const service = new OrgPersonCalendarIdentitiesService(identitiesRepo as never, {} as never)
    const result = await service.confirm({} as never, 'org-1', 'id-2')
    expect(result.match_status).toBe('confirmed')
    expect(identitiesRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      'org-1',
      'id-2',
      expect.objectContaining({
        match_status: 'confirmed',
        channel_member_id: null,
      }),
    )
  })

  it('links Slack onto Directory emails only and never creates external rows', async () => {
    const identitiesRepo = {
      normalizeEmail: (email: string) => email.trim().toLowerCase(),
      deleteNonDirectorySources: vi.fn().mockResolvedValue(3),
      list: vi.fn().mockResolvedValue([
        {
          id: 'dir-1',
          calendar_email: 'alex@roas.co',
          source: 'directory_sync',
          google_workspace_user_id: 'g-1',
          match_status: 'unmatched',
          vibey_user_id: null,
          person_brain_id: null,
        },
      ]),
      update: vi.fn().mockResolvedValue({ id: 'dir-1', match_status: 'confirmed' }),
      upsertByEmail: vi.fn(),
    }
    const workspaceRepo = {
      listSlackPeopleWithEmail: vi.fn().mockResolvedValue([
        {
          id: 'cm-alex',
          email: 'alex@roas.co',
          display_name: 'Alex',
          vibey_user_id: null,
          person_brain_id: null,
        },
        {
          id: 'cm-ext',
          email: 'friend@gmail.com',
          display_name: 'External',
          vibey_user_id: null,
          person_brain_id: null,
        },
      ]),
      listPortalUsersWithEmail: vi.fn().mockResolvedValue([]),
      listPersonalCalendarLabels: vi.fn().mockResolvedValue([]),
    }
    const service = new OrgPersonCalendarIdentitiesService(
      identitiesRepo as never,
      workspaceRepo as never,
    )
    const result = await service.seedFromOrgSurfaces({} as never, 'org-1')
    expect(identitiesRepo.deleteNonDirectorySources).toHaveBeenCalled()
    expect(identitiesRepo.upsertByEmail).not.toHaveBeenCalled()
    expect(identitiesRepo.update).toHaveBeenCalledTimes(1)
    expect(identitiesRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      'org-1',
      'dir-1',
      expect.objectContaining({
        channel_member_id: 'cm-alex',
        match_status: 'confirmed',
        match_method: 'email_exact',
      }),
    )
    expect(result).toEqual({ success: true, linked: 1, pruned: 3, upserted: 1 })
  })

  it('lists only Workspace Directory identities', async () => {
    const identitiesRepo = {
      list: vi.fn().mockResolvedValue([
        {
          id: 'dir-1',
          source: 'directory_sync',
          google_workspace_user_id: 'g-1',
          calendar_email: 'alex@roas.co',
        },
        {
          id: 'slack-1',
          source: 'slack_email',
          google_workspace_user_id: null,
          calendar_email: 'friend@gmail.com',
        },
        {
          id: 'manual-1',
          source: 'manual',
          google_workspace_user_id: null,
          calendar_email: 'vendor@agency.com',
        },
      ]),
    }
    const service = new OrgPersonCalendarIdentitiesService(identitiesRepo as never, {} as never)
    const result = await service.list({} as never, 'org-1')
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('dir-1')
  })

  it('refuses createManual for emails outside the Workspace Directory', async () => {
    const identitiesRepo = {
      normalizeEmail: (email: string) => email.trim().toLowerCase(),
      findByEmail: vi.fn().mockResolvedValue(null),
    }
    const service = new OrgPersonCalendarIdentitiesService(identitiesRepo as never, {} as never)
    await expect(
      service.createManual({} as never, 'org-1', { calendar_email: 'friend@gmail.com' }),
    ).rejects.toThrow(/Workspace Directory/)
  })
})
