import { describe, expect, it, vi } from 'vitest'
import { MissionsPlanDecisionService } from './missions-plan-decision.service'

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    neq: vi.fn(() => query),
    order: vi.fn(() => query),
    update: vi.fn(() => query),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

function createService(overrides: Record<string, unknown> = {}) {
  const postgresDirect = {
    withMissionAdvisoryLock: vi.fn((_missionId: string, callback: () => Promise<unknown>) =>
      callback(),
    ),
  }
  const missionsRepository = {
    findMissionById: vi.fn().mockResolvedValue({
      id: 'mission-1',
      status: 'pending_approval',
      campaign_id: 'campaign-1',
      priority: 'high',
      correlation_id: 'corr-1',
    }),
    findPlanByMissionId: vi.fn().mockResolvedValue({
      id: 'plan-1',
      content: { recommended_hires: [{ role_key: 'copywriter' }] },
    }),
    updateMissionStatus: vi.fn().mockResolvedValue({ id: 'mission-1' }),
    insertMissionLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
  }
  const agentOnboardingService = {
    hireReadyEmployee: vi.fn().mockResolvedValue({ agent: { agent_key: 'copywriter_1' } }),
  }
  const missionOutboxService = {
    enqueueOutboxEvent: vi.fn().mockResolvedValue(undefined),
  }

  return {
    service: new MissionsPlanDecisionService(
      (overrides.postgresDirect ?? postgresDirect) as never,
      (overrides.missionsRepository ?? missionsRepository) as never,
      (overrides.agentOnboardingService ?? agentOnboardingService) as never,
      (overrides.missionOutboxService ?? missionOutboxService) as never,
    ),
    postgresDirect,
    missionsRepository,
    agentOnboardingService,
    missionOutboxService,
  }
}

describe('MissionsPlanDecisionService', () => {
  it('approves a plan by hiring recommended agents and queueing root subtasks', async () => {
    const subtaskRows = [
      {
        id: 'sub-agent',
        assigned_agent_key: 'copywriter',
        assignee_type: 'agent',
        assigned_user_id: null,
        depends_on: [],
        status: 'pending',
        scheduled_at: '2026-07-01T10:00:00.000Z',
      },
      {
        id: 'sub-human',
        assigned_agent_key: null,
        assignee_type: 'human',
        assigned_user_id: 'human-1',
        depends_on: [],
        status: 'pending',
        scheduled_at: null,
      },
    ]
    const queries: Record<string, Array<Record<string, any>>> = {}
    const supabase = {
      from: vi.fn((table: string) => {
        const result =
          table === 'agents_registry'
            ? { data: { agent_key: 'copywriter_1', name: 'Writer' }, error: null }
            : table === 'mission_subtasks'
              ? { data: subtaskRows, error: null }
              : { data: null, error: null }
        const query = createQuery(result)
        queries[table] = [...(queries[table] ?? []), query]
        return query
      }),
    }
    const { service, missionsRepository, agentOnboardingService, missionOutboxService } =
      createService()

    await expect(
      service.approvePlan(supabase as never, 'user-1', 'mission-1', 'org-1'),
    ).resolves.toEqual({
      ok: true,
      hired: [{ role_key: 'copywriter', agent_key: 'copywriter_1' }],
    })

    expect(agentOnboardingService.hireReadyEmployee).toHaveBeenCalledWith(
      supabase,
      'user-1',
      { role_key: 'copywriter' },
      'org-1',
    )
    expect(queries.campaign_agents?.[0]?.upsert).toHaveBeenCalledWith(
      {
        campaign_id: 'campaign-1',
        user_id: 'user-1',
        org_id: 'org-1',
        agent_key: 'copywriter_1',
        name: 'Writer',
        status: 'idle',
      },
      { onConflict: 'campaign_id,agent_key' },
    )
    expect(queries.mission_subtasks?.[1]?.update).toHaveBeenCalledWith({
      assigned_agent_key: 'copywriter_1',
      updated_at: expect.any(String),
    })
    expect(queries.mission_subtasks?.[2]?.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'awaiting_human',
        awaiting_human_since: expect.any(String),
        sla_escalate_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    )
    expect(missionOutboxService.enqueueOutboxEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: 'mission.subtask.execute.requested',
        dedupeKey: 'mission:mission-1:subtask:sub-agent:execute:approved:plan-1',
        nextAttemptAt: '2026-07-01T10:00:00.000Z',
      }),
    )
    expect(missionOutboxService.enqueueOutboxEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: 'mission.subtask.awaiting_human.requested',
        dedupeKey: 'mission:mission-1:subtask:sub-human:awaiting_human:approved:plan-1',
      }),
    )
    expect(missionsRepository.updateMissionStatus).toHaveBeenCalledWith(
      supabase,
      'mission-1',
      'user-1',
      'org-1',
      { status: 'todo' },
    )
  })

  it('rejects a plan by cancelling incomplete subtasks and requeueing planning', async () => {
    const queries: Record<string, Array<Record<string, any>>> = {}
    const supabase = {
      from: vi.fn((table: string) => {
        const query = createQuery({ data: null, error: null })
        queries[table] = [...(queries[table] ?? []), query]
        return query
      }),
    }
    const { service, missionsRepository, missionOutboxService } = createService()

    await expect(service.rejectPlan(supabase as never, 'user-1', 'mission-1', null)).resolves.toEqual(
      { ok: true },
    )

    expect(queries.mission_subtasks?.[0]?.update).toHaveBeenCalledWith({
      status: 'cancelled',
      updated_at: expect.any(String),
    })
    expect(queries.mission_subtasks?.[0]?.neq).toHaveBeenCalledWith('status', 'done')
    expect(queries.mission_subtasks?.[0]?.neq).toHaveBeenCalledWith('status', 'cancelled')
    expect(missionsRepository.updateMissionStatus).toHaveBeenCalledWith(
      supabase,
      'mission-1',
      'user-1',
      null,
      { status: 'planning', current_agent_key: null },
    )
    expect(missionOutboxService.enqueueOutboxEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: 'mission.plan.requested',
        dedupeKey: 'mission:mission-1:plan:rejected',
        requeueExistingDedupeKey: true,
      }),
    )
  })
})
