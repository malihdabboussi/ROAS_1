import { describe, expect, it, vi } from 'vitest'
import { OrgPersonCalendarIdentitiesService } from '../org-person-calendar-identities.service'

describe('OrgPersonCalendarIdentitiesService', () => {
  it('confirms suggested links onto durable columns', async () => {
    const identitiesRepo = {
      normalizeEmail: (email: string) => email.trim().toLowerCase(),
      findById: vi.fn().mockResolvedValue({
        id: 'id-1',
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
})
