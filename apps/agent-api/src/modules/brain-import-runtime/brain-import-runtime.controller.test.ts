import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { BrainImportRuntimeController } from './controllers/brain-import-runtime.controller'

describe('BrainImportRuntimeController', () => {
  it('executes a brain import job through the runtime service', async () => {
    const runtime = {
      execute: vi.fn(async () => ({ type: 'terminal', status: 'done', job_id: 'job-1' })),
    }
    const controller = new BrainImportRuntimeController(runtime as never)

    await expect(controller.executeJob('job-1', { jobId: 'job-1' })).resolves.toEqual({
      type: 'terminal',
      status: 'done',
      job_id: 'job-1',
    })

    expect(runtime.execute).toHaveBeenCalledWith('job-1')
  })

  it('rejects mismatched job ids', async () => {
    const controller = new BrainImportRuntimeController({ execute: vi.fn() } as never)

    await expect(controller.executeJob('job-1', { jobId: 'job-2' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })
})
