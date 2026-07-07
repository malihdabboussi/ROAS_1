import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { SkService } from '../sk.service'

describe('SkService protected mutations', () => {
  it('loads entry brain before checking training permission', async () => {
    const supabase = {}
    const permissions = { assertCanTrainBrain: vi.fn().mockResolvedValue(undefined) }
    const skRepository = {
      findEntryBrainId: vi.fn().mockResolvedValue('brain-1'),
    }
    const service = new SkService({ getEmbedding: vi.fn() } as never, skRepository as never)
    vi.spyOn(service, 'deleteEntry').mockResolvedValue({ success: true })

    await expect(
      service.deleteEntryWithTrainingPermission(
        supabase as never,
        'user-1',
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
        'entry-1',
        permissions as never,
      ),
    ).resolves.toEqual({ success: true })

    expect(skRepository.findEntryBrainId).toHaveBeenCalledWith(supabase, 'entry-1')
    expect(permissions.assertCanTrainBrain).toHaveBeenCalledWith(
      supabase,
      'user-1',
      { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
      'brain-1',
    )
    expect(service.deleteEntry).toHaveBeenCalledWith(supabase, 'user-1', 'entry-1')
  })

  it('rejects missing entries before training permission checks', async () => {
    const supabase = {}
    const permissions = { assertCanTrainBrain: vi.fn() }
    const skRepository = {
      findEntryBrainId: vi.fn().mockResolvedValue(null),
    }
    const service = new SkService({ getEmbedding: vi.fn() } as never, skRepository as never)
    vi.spyOn(service, 'deleteEntry').mockResolvedValue({ success: true })

    await expect(
      service.deleteEntryWithTrainingPermission(
        supabase as never,
        'user-1',
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
        'entry-1',
        permissions as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(skRepository.findEntryBrainId).toHaveBeenCalledWith(supabase, 'entry-1')
    expect(permissions.assertCanTrainBrain).not.toHaveBeenCalled()
    expect(service.deleteEntry).not.toHaveBeenCalled()
  })
})
