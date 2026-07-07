import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { MissionLifecycleService } from './mission-lifecycle.service'

type QueryResult = {
  data?: unknown
  error?: { message: string } | null
}

function createQuery(result: QueryResult = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    like: vi.fn(() => query),
    update: vi.fn(() => query),
    insert: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

function createHarness(tableResults: Record<string, QueryResult> = {}) {
  const queries: Record<string, Record<string, any>> = {}
  const supabase = {
    from: vi.fn((table: string) => {
      const query = createQuery(tableResults[table] ?? { data: null, error: null })
      queries[table] = query
      return query
    }),
  } as unknown as SupabaseClient

  const missionsRepository = {
    findMissionByIdempotencyKey: vi.fn().mockResolvedValue(null),
    findMissionSpaceForCreate: vi.fn(async (supabase: SupabaseClient, spaceId: string) => {
      const { data, error } = await supabase
        .from('spaces')
        .select('id, campaign_id')
        .eq('id', spaceId)
        .maybeSingle()
      if (error) throw new Error(`Failed to load mission space: ${error.message}`)
      return data
    }),
    findCampaignOwnerForCreate: vi.fn(async (supabase: SupabaseClient, campaignId: string) => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('user_id')
        .eq('id', campaignId)
        .maybeSingle()
      if (error) throw new Error(`Failed to load campaign owner: ${error.message}`)
      return data
    }),
    touchProfileLastInteraction: vi.fn(
      async (supabase: SupabaseClient, userId: string, lastInteractionAt: string) => {
        await supabase
          .from('profiles')
          .update({ last_interaction_at: lastInteractionAt })
          .eq('id', userId)
      },
    ),
    findPrimaryManagerKey: vi.fn().mockResolvedValue('vibey'),
    createMission: vi.fn(async (_supabase: SupabaseClient, input: Record<string, unknown>) => ({
      id: 'mission-1',
      ...input,
    })),
    insertMissionLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
    findMissionById: vi.fn().mockResolvedValue({
      id: 'mission-1',
      user_id: 'user-1',
      org_id: 'org-1',
      status: 'todo',
      priority: 'medium',
      correlation_id: 'correlation-1',
    }),
    updateSubtask: vi.fn().mockResolvedValue({ id: 'subtask-1', scheduled_at: null }),
    reschedulePendingSubtaskExecutionOutbox: vi.fn(
      async (
        supabase: SupabaseClient,
        missionId: string,
        subtaskId: string,
        nextAttemptAt: string,
      ) => {
        await supabase
          .from('mission_outbox')
          .update({ next_attempt_at: nextAttemptAt })
          .eq('mission_id', missionId)
          .eq('event_type', 'mission.subtask.execute.requested')
          .eq('status', 'pending')
          .like('dedupe_key', `%:subtask:${subtaskId}:%`)
      },
    ),
  }
  const postgresDirect = {
    hasConnectionString: vi.fn().mockReturnValue(false),
    query: vi.fn().mockResolvedValue({ rows: [{ has_edit: true }], rowCount: 1 }),
    withMissionAdvisoryLock: vi.fn(async (_missionId: string, fn: () => Promise<unknown>) => fn()),
  }
  const missionOutboxService = {
    enqueueOutboxEvent: vi.fn().mockResolvedValue(undefined),
  }
  const missionPermissions = {
    assertCanAccessMission: vi.fn().mockResolvedValue('edit'),
    redactMission: vi.fn((mission: Record<string, unknown>) => mission),
  }
  const spacePermissions = {
    assertCanAccessSpace: vi.fn().mockResolvedValue('edit'),
  }
  const missionListSummary = {
    appendSubtaskSummaries: vi.fn(),
  }
  const nativeTxService = {
    isEnabled: vi.fn().mockReturnValue(false),
  }

  const service = new MissionLifecycleService(
    missionsRepository as never,
    postgresDirect as never,
    missionOutboxService as never,
    missionPermissions as never,
    spacePermissions as never,
    missionListSummary as never,
    nativeTxService as never,
  )

  return {
    service,
    supabase,
    queries,
    missionsRepository,
    postgresDirect,
    missionOutboxService,
    missionPermissions,
    spacePermissions,
  }
}

describe('MissionLifecycleService', () => {
  it('creates space missions with the space campaign and requester metadata', async () => {
    const { service, supabase, queries, missionsRepository, missionOutboxService, spacePermissions } =
      createHarness({
        spaces: { data: { id: 'space-1', campaign_id: 'campaign-1' }, error: null },
        profiles: { data: null, error: null },
      })

    const result = await service.create(
      supabase,
      'user-1',
      {
        title: 'Space mission',
        brief: 'Brief',
        space_id: 'space-1',
        assigned_agent_key: 'vibey',
        idempotency_key: 'mission-key-123',
      },
      'org-1',
      'admin',
    )

    expect(spacePermissions.assertCanAccessSpace).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'admin',
      'space-1',
      'edit',
      'org-1',
    )
    expect(queries.spaces.select).toHaveBeenCalledWith('id, campaign_id')
    expect(queries.spaces.eq).toHaveBeenCalledWith('id', 'space-1')
    expect(missionsRepository.findMissionByIdempotencyKey).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'mission-key-123',
      'org-1',
    )
    expect(missionsRepository.createMission).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        campaign_id: 'campaign-1',
        space_id: 'space-1',
        mission_visibility: 'space',
      }),
    )
    expect(queries.profiles.update).toHaveBeenCalledWith({
      last_interaction_at: expect.any(String),
    })
    expect(queries.profiles.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(missionsRepository.insertMissionLog).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        event_type: 'mission.created',
        payload: expect.objectContaining({ requested_by_user_id: 'user-1' }),
      }),
    )
    expect(missionOutboxService.enqueueOutboxEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        missionId: 'mission-1',
        userId: 'user-1',
        eventType: 'mission.plan.requested',
      }),
    )
    expect(result).toMatchObject({
      id: 'mission-1',
      campaign_id: 'campaign-1',
      space_id: 'space-1',
      mission_visibility: 'space',
      requested_by_user_id: 'user-1',
    })
  })

  it('creates campaign missions for the campaign owner after editor validation', async () => {
    const { service, supabase, queries, missionsRepository, postgresDirect } = createHarness({
      campaigns: { data: { user_id: 'owner-1' }, error: null },
      profiles: { data: null, error: null },
    })

    await service.create(
      supabase,
      'user-1',
      {
        title: 'Campaign mission',
        campaign_id: 'campaign-1',
        assigned_agent_key: 'vibey',
        idempotency_key: 'mission-key-456',
      },
      'org-1',
      'admin',
    )

    expect(queries.campaigns.select).toHaveBeenCalledWith('user_id')
    expect(queries.campaigns.eq).toHaveBeenCalledWith('id', 'campaign-1')
    expect(postgresDirect.query).toHaveBeenCalledWith(expect.stringContaining('SELECT EXISTS'), [
      'user-1',
      'campaign-1',
    ])
    expect(missionsRepository.findMissionByIdempotencyKey).toHaveBeenCalledWith(
      supabase,
      'owner-1',
      'mission-key-456',
      'org-1',
    )
    expect(missionsRepository.createMission).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        user_id: 'owner-1',
        campaign_id: 'campaign-1',
        mission_visibility: 'private',
      }),
    )
    expect(queries.profiles.eq).toHaveBeenCalledWith('id', 'owner-1')
  })

  it('reschedules pending subtask execution outbox when scheduled_at changes', async () => {
    const { service, supabase, queries, missionsRepository, missionPermissions } = createHarness({
      mission_outbox: { data: null, error: null },
    })
    const nextAttemptAt = '2026-06-17T08:00:00.000Z'

    await service.updateSubtask(
      supabase,
      'user-1',
      'mission-1',
      'subtask-1',
      { scheduled_at: nextAttemptAt },
      'org-1',
    )

    expect(missionsRepository.findMissionById).toHaveBeenCalledWith(
      supabase,
      'mission-1',
      'user-1',
      'org-1',
    )
    expect(missionPermissions.assertCanAccessMission).toHaveBeenCalledWith(
      supabase,
      'user-1',
      null,
      expect.objectContaining({ id: 'mission-1' }),
      'edit',
      'org-1',
    )
    expect(missionsRepository.updateSubtask).toHaveBeenCalledWith(
      supabase,
      'subtask-1',
      'user-1',
      'org-1',
      { scheduled_at: nextAttemptAt },
    )
    expect(queries.mission_outbox.update).toHaveBeenCalledWith({
      next_attempt_at: nextAttemptAt,
    })
    expect(queries.mission_outbox.eq).toHaveBeenCalledWith('mission_id', 'mission-1')
    expect(queries.mission_outbox.eq).toHaveBeenCalledWith(
      'event_type',
      'mission.subtask.execute.requested',
    )
    expect(queries.mission_outbox.eq).toHaveBeenCalledWith('status', 'pending')
    expect(queries.mission_outbox.like).toHaveBeenCalledWith(
      'dedupe_key',
      '%:subtask:subtask-1:%',
    )
  })
})
