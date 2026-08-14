import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { InternalBrainImportJobsController } from './controllers/internal-brain-import-jobs.controller'

function makeController(importJobs: {
  enqueueDueJobs: () => Promise<void>
  processRuntimeJob: (jobId: string) => Promise<void>
  claimRuntimeJobForExternalExecution: (jobId: string) => Promise<unknown>
  markRuntimeJobProgress: (jobId: string, input: unknown) => Promise<unknown>
  succeedRuntimeJob: (jobId: string, input: unknown) => Promise<unknown>
  failRuntimeJob: (jobId: string, input: unknown) => Promise<unknown>
}) {
  return new (InternalBrainImportJobsController as any)(importJobs)
}

describe('InternalController brain import runtime routes', () => {
  function makeImportJobs() {
    return {
      enqueueDueJobs: vi.fn(async () => undefined),
      processRuntimeJob: vi.fn(async () => undefined),
      claimRuntimeJobForExternalExecution: vi.fn(async () => ({
        claimed: true,
        job_id: 'import-job-1',
        attempts: 1,
      })),
      markRuntimeJobProgress: vi.fn(async () => ({ success: true, job_id: 'import-job-1' })),
      succeedRuntimeJob: vi.fn(async () => ({ success: true, job_id: 'import-job-1' })),
      failRuntimeJob: vi.fn(async () => ({ success: true, job_id: 'import-job-1' })),
    }
  }

  it('enqueues due brain import jobs through the import job service', async () => {
    const importJobs = makeImportJobs()
    const controller = makeController(importJobs)

    await expect(controller.enqueueDueBrainImportJobs()).resolves.toEqual({ success: true })

    expect(importJobs.enqueueDueJobs).toHaveBeenCalledOnce()
  })

  it('processes a concrete brain import job through the import job service', async () => {
    const importJobs = makeImportJobs()
    const controller = makeController(importJobs)

    await expect(controller.processBrainImportJob(' import-job-1 ')).resolves.toEqual({
      success: true,
      job_id: 'import-job-1',
    })

    expect(importJobs.processRuntimeJob).toHaveBeenCalledWith('import-job-1')
  })

  it('rejects blank brain import job ids', async () => {
    const controller = makeController(makeImportJobs())

    await expect(controller.processBrainImportJob('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('claims a concrete brain import job for external execution', async () => {
    const importJobs = makeImportJobs()
    const controller = makeController(importJobs)

    await expect(controller.claimBrainImportJob(' import-job-1 ')).resolves.toEqual({
      success: true,
      claimed: true,
      job_id: 'import-job-1',
      attempts: 1,
    })

    expect(importJobs.claimRuntimeJobForExternalExecution).toHaveBeenCalledWith('import-job-1')
  })

  it('updates progress for API-owned brain import lifecycle state', async () => {
    const importJobs = makeImportJobs()
    const controller = makeController(importJobs)

    await controller.progressBrainImportJob(' import-job-1 ', {
      attempts: 1,
      chunksCompleted: 2,
      chunksTotal: 5,
    })

    expect(importJobs.markRuntimeJobProgress).toHaveBeenCalledWith('import-job-1', {
      attempts: 1,
      chunksCompleted: 2,
      chunksTotal: 5,
    })
  })

  it('marks brain import jobs succeeded through API-owned lifecycle state', async () => {
    const importJobs = makeImportJobs()
    const controller = makeController(importJobs)

    await controller.succeedBrainImportJob(' import-job-1 ', {
      attempts: 1,
      result: { status: 'completed' },
    })

    expect(importJobs.succeedRuntimeJob).toHaveBeenCalledWith('import-job-1', {
      attempts: 1,
      result: { status: 'completed' },
    })
  })

  it('marks brain import jobs failed through API-owned lifecycle state', async () => {
    const importJobs = makeImportJobs()
    const controller = makeController(importJobs)

    await controller.failBrainImportJob(' import-job-1 ', {
      attempts: 1,
      message: 'Atlas failed',
    })

    expect(importJobs.failRuntimeJob).toHaveBeenCalledWith('import-job-1', {
      attempts: 1,
      message: 'Atlas failed',
    })
  })
})
