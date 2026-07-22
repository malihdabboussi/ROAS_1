import { describe, expect, it, vi } from 'vitest'
import { MissionInternalService } from '../mission-internal.service'

describe('mission manager retry cascade', () => {
  it('reopens an awaiting-human mission and resets every active dependent', async () => {
    const supabase = {} as any
    const mission = {
      id: '00000000-0000-4000-8000-000000000001',
      user_id: '00000000-0000-4000-8000-000000000002',
      org_id: '00000000-0000-4000-8000-000000000003',
      status: 'awaiting_human',
      priority: 'high',
      correlation_id: '00000000-0000-4000-8000-000000000004',
    }
    const rootId = '00000000-0000-4000-8000-000000000010'
    const recommendationId = '00000000-0000-4000-8000-000000000011'
    const scriptsId = '00000000-0000-4000-8000-000000000012'
    const gateId = '00000000-0000-4000-8000-000000000013'
    const retryRows = [
      { id: rootId, status: 'done', depends_on: [] },
      { id: recommendationId, status: 'done', depends_on: [rootId] },
      { id: scriptsId, status: 'done', depends_on: [recommendationId] },
      { id: gateId, status: 'awaiting_human', depends_on: [scriptsId] },
    ]
    const missionsRepository = {
      findMissionById: vi.fn().mockResolvedValue(mission),
      updateMissionStatus: vi.fn().mockResolvedValue(mission),
      insertMissionLog: vi.fn().mockResolvedValue(undefined),
    } as any
    const missionInternalRepository = {
      findMissionLogByIdempotencyKey: vi.fn().mockResolvedValue(null),
      findManagerSubtask: vi.fn().mockResolvedValue({
        id: rootId,
        status: 'done',
        title: 'Task 3 - Research competitive ads',
        scheduled_at: null,
      }),
      listSubtasksForRetryCascade: vi.fn().mockResolvedValue(retryRows),
      resetSubtasksForRetry: vi.fn().mockResolvedValue(undefined),
      listSubtaskStatusesForAggregate: vi
        .fn()
        .mockResolvedValue(retryRows.map((row) => ({ ...row, status: 'pending' }))),
    } as any
    const postgresDirect = {
      hasConnectionString: vi.fn().mockReturnValue(false),
      withMissionAdvisoryLock: vi.fn((_id, callback) => callback()),
    } as any
    const missionOutboxService = {
      enqueueOutboxEvent: vi.fn().mockResolvedValue(undefined),
    } as any
    const service = new MissionInternalService(
      missionsRepository,
      postgresDirect,
      missionOutboxService,
      {} as any,
      missionInternalRepository,
      { getClient: vi.fn().mockReturnValue(supabase) } as any,
    )

    await service.managerRetrySubtask({
      mission_id: mission.id,
      user_id: mission.user_id,
      org_id: mission.org_id,
      subtask_id: rootId,
      idempotency_key: 'proof-retry-cascade',
    })

    expect(missionInternalRepository.resetSubtasksForRetry).toHaveBeenCalledWith(
      supabase,
      [rootId, recommendationId, scriptsId, gateId],
      expect.any(String),
    )
    expect(missionsRepository.updateMissionStatus).toHaveBeenCalledWith(
      supabase,
      mission.id,
      mission.user_id,
      mission.org_id,
      expect.objectContaining({ status: 'in_progress' }),
    )
    expect(missionOutboxService.enqueueOutboxEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: 'mission.subtask.execute.requested',
        payload: expect.objectContaining({ subtask_id: rootId }),
      }),
    )
  })
})
