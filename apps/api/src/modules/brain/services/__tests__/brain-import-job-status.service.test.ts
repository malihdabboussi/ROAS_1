import { describe, expect, it, vi } from 'vitest'
import { BrainImportJobStatusRepository } from '../../repositories/brain-import-job-status.repository'
import { BrainImportJobStatusService } from '../brain-import-job-status.service'

type QueryResult = {
  data: Array<Record<string, unknown>> | null
  error: { message: string } | null
}

function createQuery(result: QueryResult) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
  }
}

describe('BrainImportJobStatusService', () => {
  it('maps and merges active import jobs with brain ops jobs', async () => {
    const importQuery = createQuery({
      data: [
        {
          id: 'import-1',
          job_type: 'sk_ingest',
          title: 'Agent training',
          status: 'processing',
          payload: { brainId: 'brain-1' },
          result: null,
          last_error: null,
          created_at: '2026-06-15T09:10:00.000Z',
          updated_at: '2026-06-15T09:11:00.000Z',
          completed_at: null,
        },
      ],
      error: null,
    })
    const brainOpsQuery = createQuery({
      data: [
        {
          id: 'brain-op-1',
          event_type: 'brain_pattern_analysis',
          status: 'done',
          error: null,
          created_at: '2026-06-15T09:05:00.000Z',
          processed_at: '2026-06-15T09:06:00.000Z',
          brain_id: 'brain-1',
          payload: {},
        },
      ],
      error: null,
    })
    const admin = {
      from: vi.fn((table: string) => (table === 'brain_import_jobs' ? importQuery : brainOpsQuery)),
    }
    const repository = new BrainImportJobStatusRepository()
    ;(repository as never as { getAdminClient: () => unknown }).getAdminClient = () => admin
    const service = new BrainImportJobStatusService(repository)

    const jobs = await service.listActiveJobs('user-1', { brainId: 'brain-1', limit: 10 })

    expect(importQuery.eq).toHaveBeenCalledWith('payload->>brainId', 'brain-1')
    expect(brainOpsQuery.eq).toHaveBeenCalledWith('brain_id', 'brain-1')
    expect(brainOpsQuery.in).toHaveBeenCalledWith('event_type', [
      'brain_library_sync',
      'brain_pattern_analysis',
      'brain_timeline_synthesis',
    ])
    expect(jobs).toEqual([
      {
        id: 'brain-op-1',
        job_type: 'brain_pattern_analysis',
        queue_kind: 'brain_ops',
        title: 'Crystallize beliefs and perspectives',
        status: 'succeeded',
        brain_id: 'brain-1',
        result: { event_type: 'brain_pattern_analysis' },
        last_error: null,
        created_at: '2026-06-15T09:05:00.000Z',
        updated_at: null,
        completed_at: '2026-06-15T09:06:00.000Z',
      },
      {
        id: 'import-1',
        job_type: 'sk_ingest',
        queue_kind: 'import',
        title: 'Agent training',
        status: 'processing',
        brain_id: 'brain-1',
        result: null,
        last_error: null,
        created_at: '2026-06-15T09:10:00.000Z',
        updated_at: '2026-06-15T09:11:00.000Z',
        completed_at: null,
      },
    ])
  })

  it('filters the personal brain queue to user-brain imports without a brain id', async () => {
    const importQuery = createQuery({ data: [], error: null })
    const brainOpsQuery = createQuery({ data: [], error: null })
    const admin = {
      from: vi.fn((table: string) => (table === 'brain_import_jobs' ? importQuery : brainOpsQuery)),
    }
    const repository = new BrainImportJobStatusRepository()
    ;(repository as never as { getAdminClient: () => unknown }).getAdminClient = () => admin
    const service = new BrainImportJobStatusService(repository)

    await service.listActiveJobs('user-1', { targetBrain: 'user', limit: 10 })

    expect(importQuery.in).toHaveBeenCalledWith('job_type', [
      'document_remember',
      'user_link_import',
      'fathom_meeting_import',
      'fireflies_transcript_import',
      'meeting_transcript_import',
    ])
    expect(importQuery.is).toHaveBeenCalledWith('payload->>brainId', null)
    expect(importQuery.eq).not.toHaveBeenCalledWith('payload->>brainId', expect.any(String))
  })

  it('omits cortex brain-ops from campaign-scoped queues', async () => {
    const importQuery = createQuery({ data: [], error: null })
    const brainOpsQuery = createQuery({
      data: [
        {
          id: 'brain-op-leak',
          event_type: 'brain_pattern_analysis',
          status: 'pending',
          error: null,
          created_at: '2026-07-13T03:37:00.000Z',
          processed_at: null,
          brain_id: 'other-brain',
          payload: {},
        },
      ],
      error: null,
    })
    const admin = {
      from: vi.fn((table: string) => (table === 'brain_import_jobs' ? importQuery : brainOpsQuery)),
    }
    const repository = new BrainImportJobStatusRepository()
    ;(repository as never as { getAdminClient: () => unknown }).getAdminClient = () => admin
    const service = new BrainImportJobStatusService(repository)

    const jobs = await service.listActiveJobs('user-1', {
      campaignId: 'campaign-impact',
      limit: 10,
    })

    expect(jobs).toEqual([])
    expect(admin.from).not.toHaveBeenCalledWith('brain_ops_outbox')
  })

  it('returns false when cancel does not update a matching active job', async () => {
    const query = createQuery({ data: [], error: null })
    const admin = { from: vi.fn(() => query) }
    const repository = new BrainImportJobStatusRepository()
    ;(repository as never as { getAdminClient: () => unknown }).getAdminClient = () => admin
    const service = new BrainImportJobStatusService(repository)

    await expect(service.cancelJob('user-1', 'job-1')).resolves.toBe(false)

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        last_error: 'Cancelled by user',
      }),
    )
    expect(query.in).toHaveBeenCalledWith('status', ['queued', 'processing', 'retry'])
  })
})
