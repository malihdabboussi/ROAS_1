import { describe, expect, it, vi } from 'vitest'
import { ArtifactMediaJobsSweeperService } from './artifact-media-jobs-sweeper.service'

const HOUR_MS = 60 * 60 * 1000

function makeService(overrides: {
  jobs?: Array<Record<string, unknown>>
  claimResult?: Array<Record<string, unknown>>
  completionClaimResult?: Array<Record<string, unknown>>
  statusResult?: Record<string, unknown>
}) {
  const config = { get: vi.fn(() => '') }
  const credits = {}
  const svc = { client: {} }
  const service = new ArtifactMediaJobsSweeperService(
    config as never,
    credits as never,
    svc as never,
  )
  const repository = {
    findStaleMediaJobs: vi.fn(async () => ({ data: overrides.jobs ?? [], error: null })),
    claimMediaJobForSweep: vi.fn(async () => ({
      data: overrides.claimResult ?? [{ id: 'job-1' }],
      error: null,
    })),
    claimMediaJobCompletion: vi.fn(async () => ({
      data: overrides.completionClaimResult ?? [{ id: 'job-1' }],
      error: null,
    })),
    updateMediaJob: vi.fn(async () => ({ error: null })),
  }
  const statusService = {
    getVideoStatus: vi.fn(
      async () => overrides.statusResult ?? { success: true, status: 'succeeded' },
    ),
  }
  ;(service as never as Record<string, unknown>).repository = repository
  ;(service as never as Record<string, unknown>).statusService = statusService
  return { service, repository, statusService, svc }
}

function staleJob(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'job-1',
    user_id: 'user-1',
    campaign_id: null,
    space_id: 'space-1',
    provider: 'replicate',
    provider_job_id: 'prediction-1',
    status: 'processing',
    created_at: new Date(Date.now() - HOUR_MS).toISOString(),
    ...overrides,
  }
}

describe('ArtifactMediaJobsSweeperService', () => {
  it('resolves a stale job through the shared status path with a service-role target', async () => {
    const { service, statusService, svc } = makeService({
      jobs: [staleJob()],
      statusResult: { success: true, status: 'succeeded', media_asset_id: 'asset-1' },
    })

    const summary = await service.sweepStaleVideoJobs()

    expect(summary).toEqual({ checked: 1, resolved: 1, failed: 0 })
    expect(statusService.getVideoStatus).toHaveBeenCalledTimes(1)
    const [target, input] = statusService.getVideoStatus.mock.calls[0]!
    expect(input).toEqual({ job_id: 'job-1' })
    expect((target as Record<string, any>).resolveUserId()).toBe('user-1')
    expect((target as Record<string, any>).isMissionSessionKey()).toBe(false)
    expect((target as Record<string, any>).serviceClient).toBe(svc.client)
    await expect((target as Record<string, any>).getUserClient()).resolves.toBe(svc.client)
  })

  it('skips a job whose sweep claim is held elsewhere (no double-processing)', async () => {
    const { service, statusService } = makeService({
      jobs: [staleJob()],
      claimResult: [],
    })

    const summary = await service.sweepStaleVideoJobs()

    expect(summary).toEqual({ checked: 1, resolved: 0, failed: 0 })
    expect(statusService.getVideoStatus).not.toHaveBeenCalled()
  })

  it('marks a job failed when it is still non-terminal after the fail-after window', async () => {
    const { service, repository } = makeService({
      jobs: [staleJob({ created_at: new Date(Date.now() - 25 * HOUR_MS).toISOString() })],
      statusResult: { success: true, status: 'processing' },
    })

    const summary = await service.sweepStaleVideoJobs()

    expect(summary).toEqual({ checked: 1, resolved: 0, failed: 1 })
    expect(repository.claimMediaJobCompletion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ jobId: 'job-1' }),
    )
    expect(repository.updateMediaJob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        jobId: 'job-1',
        updates: expect.objectContaining({ status: 'failed' }),
      }),
    )
  })

  it('does not expire a job whose completion claim is held by another worker', async () => {
    const { service, repository } = makeService({
      jobs: [staleJob({ created_at: new Date(Date.now() - 25 * HOUR_MS).toISOString() })],
      statusResult: { success: true, status: 'processing' },
      completionClaimResult: [],
    })

    const summary = await service.sweepStaleVideoJobs()

    expect(summary).toEqual({ checked: 1, resolved: 0, failed: 0 })
    expect(repository.updateMediaJob).not.toHaveBeenCalled()
  })

  it('leaves a young still-processing job alone', async () => {
    const { service, repository } = makeService({
      jobs: [staleJob()],
      statusResult: { success: true, status: 'processing' },
    })

    const summary = await service.sweepStaleVideoJobs()

    expect(summary).toEqual({ checked: 1, resolved: 0, failed: 0 })
    expect(repository.updateMediaJob).not.toHaveBeenCalled()
  })
})
