import { describe, expect, it, vi } from 'vitest'
import { BrainOpsHookService } from '../brain-ops-hook.service'

describe('BrainOpsHookService', () => {
  it('increments memory sync counter and stops below the sync threshold', async () => {
    const repository = {
      incrementCounter: vi.fn().mockResolvedValue({ data: 3, error: null }),
      findBrainForLibrarySync: vi.fn(),
    }
    const service = new BrainOpsHookService(repository as never)

    await service.onMemoriesSaved('brain-1', 2)

    expect(repository.incrementCounter).toHaveBeenCalledWith(
      'brain-1',
      'memories_since_last_sync',
      2,
    )
    expect(repository.findBrainForLibrarySync).not.toHaveBeenCalled()
  })
})
