import { BadRequestException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { MissionInternalService } from './mission-internal.service'

type QueryResult = {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

function createQuery(result: QueryResult = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    not: vi.fn(() => query),
    neq: vi.fn(() => query),
    in: vi.fn(() => query),
    filter: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    update: vi.fn(() => query),
    insert: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

function createSupabase(tableResults: Record<string, QueryResult[]>) {
  const queries: Array<{ table: string; query: Record<string, any> }> = []
  const supabase = {
    from: vi.fn((table: string) => {
      const result = tableResults[table]?.shift() ?? { data: null, error: null }
      const query = createQuery(result)
      queries.push({ table, query })
      return query
    }),
  } as unknown as SupabaseClient

  return { supabase, queries }
}

function createHarness(tableResults: Record<string, QueryResult[]>) {
  const { supabase, queries } = createSupabase(tableResults)
  const missionsRepository = {
    findMissionById: vi.fn().mockResolvedValue({
      id: 'mission-1',
      user_id: 'user-1',
      org_id: 'org-1',
      status: 'todo',
      correlation_id: 'corr-1',
      priority: 'high',
    }),
    updateMissionStatus: vi.fn().mockResolvedValue({
      id: 'mission-1',
      status: 'blocked',
      correlation_id: 'corr-1',
    }),
    insertMissionLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
    updateMissionFields: vi.fn().mockResolvedValue({
      id: 'mission-1',
      status: 'todo',
      correlation_id: 'corr-1',
    }),
  }
  const postgresDirect = {
    hasConnectionString: vi.fn().mockReturnValue(false),
    withMissionAdvisoryLock: vi.fn(async (_missionId: string, fn: () => Promise<unknown>) => fn()),
  }
  const missionOutboxService = {
    enqueueOutboxEvent: vi.fn().mockResolvedValue(undefined),
  }
  const missionLifecycleService = {
    create: vi.fn(),
    retry: vi.fn(),
  }
  const service = new MissionInternalService(
    missionsRepository as any,
    postgresDirect as any,
    missionOutboxService as any,
    missionLifecycleService as any,
  )
  vi.spyOn(service as any, 'getServiceRoleClient').mockReturnValue(supabase)

  return {
    service,
    supabase,
    queries,
    missionsRepository,
    postgresDirect,
    missionOutboxService,
    missionLifecycleService,
  }
}

describe('MissionInternalService', () => {
  it('allows active org members who accept agent assignments to receive human subtasks', async () => {
    const { service, supabase, queries } = createHarness({
      org_members: [{ data: { user_id: 'user-1', status: 'active' }, error: null }],
      profiles: [{ data: { accepts_agent_assignments: true }, error: null }],
    })

    await expect(
      (service as any).assertHumanAssignee(supabase, 'org-1', 'user-1'),
    ).resolves.toBeUndefined()

    expect(queries[0].table).toBe('org_members')
    expect(queries[0].query.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(queries[0].query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(queries[1].table).toBe('profiles')
    expect(queries[1].query.select).toHaveBeenCalledWith(
      'accepts_agent_assignments,functional_role,specialties',
    )
  })

  it('rejects inactive human assignees before plan creation', async () => {
    const { service, supabase } = createHarness({
      org_members: [{ data: { user_id: 'user-1', status: 'inactive' }, error: null }],
    })

    await expect(
      (service as any).assertHumanAssignee(supabase, 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('pushes telegram awareness content when channel and conversation metadata exist', async () => {
    const { service } = createHarness({
      agent_channels: [
        {
          data: {
            provider_config: { bot_token: 'bot-token-1' },
          },
          error: null,
        },
      ],
      conversations: [
        {
          data: {
            metadata: { telegram_chat_id: 'chat-1' },
          },
          error: null,
        },
      ],
    })
    const telegramApi = { sendMessage: vi.fn().mockResolvedValue(undefined) }
    ;(service as any).telegramApi = telegramApi

    await expect(
      service.pushTelegramAwarenessPoint('user-1', 'agent-1', 'Heads up'),
    ).resolves.toEqual({ ok: true })

    expect(telegramApi.sendMessage).toHaveBeenCalledWith('bot-token-1', 'chat-1', 'Heads up')
  })

  it('returns idempotent manager field amendments without touching the mission', async () => {
    const { service, missionsRepository } = createHarness({
      missions_logs: [{ data: { id: 'log-1' }, error: null }],
    })

    await expect(
      service.managerAmendFields({
        mission_id: 'mission-1',
        user_id: 'user-1',
        org_id: 'org-1',
        title: 'Updated title',
        idempotency_key: 'idem-123456',
      }),
    ).resolves.toEqual({ ok: true, idempotent: true })

    expect(missionsRepository.findMissionById).not.toHaveBeenCalled()
    expect(missionsRepository.updateMissionFields).not.toHaveBeenCalled()
  })

  it('cancels a subtask and every active dependent before recomputing mission aggregate state', async () => {
    const { service, queries, missionsRepository } = createHarness({
      mission_subtasks: [
        {
          data: {
            id: 'subtask-1',
            mission_id: 'mission-1',
            user_id: 'user-1',
            status: 'pending',
            title: 'First task',
          },
          error: null,
        },
        {
          data: [
            { id: 'subtask-1', depends_on: [] },
            { id: 'subtask-2', depends_on: ['subtask-1'] },
            { id: 'subtask-3', depends_on: ['subtask-2'] },
          ],
          error: null,
        },
        { data: null, error: null },
        {
          data: [
            { id: 'subtask-1', status: 'cancelled', depends_on: [] },
            { id: 'subtask-2', status: 'cancelled', depends_on: ['subtask-1'] },
            { id: 'subtask-3', status: 'cancelled', depends_on: ['subtask-2'] },
          ],
          error: null,
        },
      ],
    })

    await expect(
      service.managerCancelSubtask({
        mission_id: 'mission-1',
        user_id: 'user-1',
        org_id: 'org-1',
        subtask_id: 'subtask-1',
      }),
    ).resolves.toEqual({ ok: true, cancelled_count: 3 })

    const updateQuery = queries.find(
      ({ table, query }) => table === 'mission_subtasks' && query.update.mock.calls.length > 0,
    )?.query
    expect(updateQuery?.in).toHaveBeenCalledWith('id', ['subtask-1', 'subtask-2', 'subtask-3'])
    expect(missionsRepository.insertMissionLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event_type: 'mission.subtask.cancelled',
        payload: expect.objectContaining({
          cancelled_subtask_ids: ['subtask-1', 'subtask-2', 'subtask-3'],
        }),
      }),
    )
    expect(missionsRepository.updateMissionStatus).toHaveBeenCalledWith(
      expect.anything(),
      'mission-1',
      'user-1',
      'org-1',
      expect.objectContaining({ status: 'blocked' }),
    )
  })
})
