import type { Queue } from 'bullmq'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissionsOutboxDispatcherService } from '../missions.outbox-dispatcher.service'

function createPublishSupabaseMock(missionStatus = 'planning') {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { status: missionStatus }, error: null })
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle,
  }
  return { from: vi.fn().mockReturnValue(chain) }
}

function createService(overrides?: { queue?: Partial<Queue>; pgQuery?: any }) {
  const queue = {
    getJob: vi.fn().mockResolvedValue(null),
    isPaused: vi.fn().mockResolvedValue(false),
    resume: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue({}),
    ...(overrides?.queue || {}),
  } as unknown as Queue

  const pgQuery = overrides?.pgQuery || vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })

  const configService = {
    get: vi.fn().mockReturnValue(20),
  } as any

  const databaseService = {
    pgQuery,
    hasPgPool: vi.fn().mockReturnValue(true),
    getClient: vi.fn().mockReturnValue(createPublishSupabaseMock()),
  } as any

  const agentSignalService = {
    mapOutboxEventToSignal: vi.fn().mockReturnValue(null),
    emitSignal: vi.fn().mockResolvedValue(undefined),
  } as any

  return {
    service: new MissionsOutboxDispatcherService(
      queue,
      configService,
      databaseService,
      agentSignalService,
    ),
    queue,
    pgQuery,
  }
}

describe('MissionsOutboxDispatcherService', () => {
  afterEach(() => {
    delete process.env.MISSIONS_OUTBOX_MISSION_ID
  })

  it('maps review request event to review phase job', () => {
    const { service } = createService()
    const mapped = (service as any).mapEventToJob({
      id: 'evt-1',
      event_type: 'mission.review.requested',
      mission_id: 'm-1',
      user_id: 'u-1',
      dedupe_key: 'd-1',
      payload: null,
    })

    expect(mapped.data.phase).toBe('review')
    expect(mapped.data.missionId).toBe('m-1')
    expect(mapped.jobId).toContain('evt-1')
  })

  it('skips queue add when deduped job is active', async () => {
    const activeJob = {
      getState: vi.fn().mockResolvedValue('waiting'),
    }
    const { service, queue } = createService({
      queue: {
        getJob: vi.fn().mockResolvedValue(activeJob),
      },
    })

    await (service as any).publishToQueue({
      id: 'evt-2',
      event_type: 'mission.plan.requested',
      mission_id: 'm-1',
      user_id: 'u-1',
      dedupe_key: 'dedupe-2',
      payload: null,
      attempts: 0,
      max_attempts: 8,
    })

    expect(queue.add).not.toHaveBeenCalled()
  })

  it('resumes a persisted paused mission queue before publishing', async () => {
    const { service, queue } = createService({
      queue: {
        isPaused: vi.fn().mockResolvedValue(true),
        resume: vi.fn().mockResolvedValue(undefined),
      },
    })

    await (service as any).publishToQueue({
      id: 'evt-paused',
      event_type: 'mission.plan.requested',
      mission_id: 'm-1',
      user_id: 'u-1',
      dedupe_key: 'dedupe-paused',
      payload: null,
      attempts: 0,
      max_attempts: 8,
    })

    expect(queue.resume).toHaveBeenCalledOnce()
    expect(queue.add).toHaveBeenCalledOnce()
    expect(vi.mocked(queue.resume).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(queue.add).mock.invocationCallOrder[0],
    )
  })

  it('marks row as dead_letter after max attempts', async () => {
    const pgQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 })
    const { service } = createService({ pgQuery })

    await (service as any).markRetry(
      {
        id: 'evt-3',
        event_type: 'mission.execute.requested',
        mission_id: 'm-1',
        user_id: 'u-1',
        dedupe_key: 'd-3',
        payload: {},
        attempts: 3,
        max_attempts: 3,
      },
      'boom',
    )

    expect(pgQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE mission_outbox'), [
      'evt-3',
      'dead_letter',
      'boom',
      8,
    ])
  })

  it('claims rows with FOR UPDATE SKIP LOCKED', async () => {
    const pgQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    const { service } = createService({ pgQuery })

    await (service as any).claimPendingRows(20)

    expect(pgQuery).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE SKIP LOCKED'), [20])
  })

  it('scopes direct DB claims when MISSIONS_OUTBOX_MISSION_ID is set', async () => {
    process.env.MISSIONS_OUTBOX_MISSION_ID = '8c4b346c-94f2-4de7-af58-ed54ea3edfc7'
    const pgQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    const { service } = createService({ pgQuery })

    await (service as any).claimPendingRows(5)

    expect(pgQuery).toHaveBeenCalledWith(expect.stringContaining('AND mission_id = $2::uuid'), [
      5,
      '8c4b346c-94f2-4de7-af58-ed54ea3edfc7',
    ])
  })
})
