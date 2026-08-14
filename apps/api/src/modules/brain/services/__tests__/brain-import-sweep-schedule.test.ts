import { describe, expect, it, vi } from 'vitest'
import { BrainImportJobsRuntimeRepository } from '../../repositories/brain-import-jobs-runtime.repository'
import { BrainImportJobsService } from '../brain-import-jobs.service'

describe('Brain import sweep scheduling', () => {
  it('schedules Page Grader catch-up separately from the frequent brain import sweep', async () => {
    const queue = { add: vi.fn().mockResolvedValue({}) }
    const service = new BrainImportJobsService(
      { get: vi.fn() } as any,
      undefined as any,
      new BrainImportJobsRuntimeRepository(),
      queue as any,
    )

    await (service as any).installRuntimeSweep()

    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      'brain-import-sweep',
      {},
      expect.objectContaining({ repeat: { every: 3_000 } }),
    )
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      'page-grader-brain-sync-sweep',
      {},
      expect.objectContaining({ repeat: { every: 60 * 60 * 1_000 } }),
    )
  })
})
