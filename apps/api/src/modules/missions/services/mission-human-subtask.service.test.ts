import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { MissionHumanSubtaskService } from './mission-human-subtask.service'

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
  const humanSubtaskRepository = {
    loadSubtask: vi.fn(async () => tableResults.__repositorySubtask?.[0]?.data),
    getMissionOwnerScope: vi.fn(async () => tableResults.__repositoryMission?.[0]?.data),
    markHumanSubtaskDone: vi.fn(),
    findAgentInMissionOrg: vi.fn(async () => tableResults.__repositoryAgent?.[0]?.data),
    bounceSubtaskToAgent: vi.fn(),
    findOrgMemberForHumanAssignment: vi.fn(async () => tableResults.__repositoryMember?.[0]?.data),
    findProfileAssignmentPreference: vi.fn(
      async () => tableResults.__repositoryProfile?.[0]?.data,
    ),
    reassignSubtaskToHuman: vi.fn(),
    blockHumanSubtask: vi.fn(),
    insertSubtaskBlockedNotification: vi.fn(),
    listSubtasksForHumanAdvance: vi.fn(async () => tableResults.__repositoryAdvance?.[0]?.data),
    moveMissionToReview: vi.fn(),
    moveDependentHumanSubtaskAwaiting: vi.fn(),
  }
  const missionsRepository = {
    createDeliverable: vi.fn().mockResolvedValue({ id: 'deliverable-1' }),
    insertMissionLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
  }
  const postgresDirect = {
    withMissionAdvisoryLock: vi.fn(async (_missionId: string, fn: () => Promise<unknown>) => fn()),
  }
  const missionOutboxService = {
    enqueueOutboxEvent: vi.fn().mockResolvedValue(undefined),
  }
  const logger = {
    logError: vi.fn().mockResolvedValue(undefined),
  }
  const service = new (MissionHumanSubtaskService as any)(
    missionsRepository,
    postgresDirect,
    missionOutboxService,
    logger,
    humanSubtaskRepository,
  ) as MissionHumanSubtaskService
  vi.spyOn(service as any, 'getServiceRoleClient').mockReturnValue(supabase)

  return {
    service,
    supabase,
    queries,
    missionsRepository,
    postgresDirect,
    missionOutboxService,
    humanSubtaskRepository,
  }
}

const baseMission = {
  user_id: 'owner-1',
  org_id: 'org-1',
  correlation_id: 'corr-1',
  priority: 'high',
  title: 'Launch campaign',
}

const assignedHumanSubtask = {
  id: 'subtask-1',
  mission_id: 'mission-1',
  title: 'Upload brief',
  status: 'awaiting_human',
  assignee_type: 'human',
  assigned_user_id: 'user-1',
}

describe('MissionHumanSubtaskService', () => {
  it('completes a human subtask, persists the deliverable, and requests review when all active work is done', async () => {
    const { service, humanSubtaskRepository, missionsRepository, missionOutboxService } =
      createHarness({
      mission_subtasks: [
        { data: assignedHumanSubtask, error: null },
        { data: null, error: null },
        {
          data: [
            { id: 'subtask-1', status: 'done', depends_on: [], assignee_type: 'human' },
            { id: 'subtask-2', status: 'done', depends_on: [], assignee_type: 'agent' },
          ],
          error: null,
        },
      ],
      missions: [{ data: baseMission, error: null }, { data: null, error: null }],
      __repositorySubtask: [{ data: assignedHumanSubtask }],
      __repositoryMission: [{ data: baseMission }],
      __repositoryAdvance: [
        {
          data: [
            { id: 'subtask-1', status: 'done', depends_on: [], assignee_type: 'human' },
            { id: 'subtask-2', status: 'done', depends_on: [], assignee_type: 'agent' },
          ],
        },
      ],
    })

    await expect(
      service.completeHuman('user-1', 'mission-1', 'subtask-1', {
        summary: 'Finished by the user',
        files: [{ url: 'https://example.com/file.pdf', name: 'file.pdf' }],
        links: [{ url: 'https://example.com', label: 'Source' }],
      }),
    ).resolves.toEqual({ ok: true, deliverable_id: 'deliverable-1' })

    expect(missionsRepository.createDeliverable).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mission_id: 'mission-1',
        user_id: 'owner-1',
        org_id: 'org-1',
        agent_key: 'human',
        type: 'file',
        title: 'Upload brief',
        content: 'Finished by the user',
      }),
    )
    expect(humanSubtaskRepository.markHumanSubtaskDone).toHaveBeenCalledWith(
      expect.anything(),
      'mission-1',
      'subtask-1',
      expect.objectContaining({
        status: 'done',
        awaiting_human_since: null,
      }),
    )
    expect(missionsRepository.insertMissionLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event_type: 'mission.subtask.human_completed',
        to_status: 'done',
      }),
    )
    expect(missionOutboxService.enqueueOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'mission.review.requested',
        priorityRank: 2,
      }),
    )
  })

  it('bounces a human subtask back to a registered agent', async () => {
    const { service, missionOutboxService, missionsRepository } = createHarness({
      mission_subtasks: [
        { data: assignedHumanSubtask, error: null },
        { data: null, error: null },
      ],
      missions: [{ data: baseMission, error: null }],
      agents_registry: [{ data: { agent_key: 'atlas' }, error: null }],
      __repositorySubtask: [{ data: assignedHumanSubtask }],
      __repositoryMission: [{ data: baseMission }],
      __repositoryAgent: [{ data: { agent_key: 'atlas' } }],
    })

    await expect(
      service.bounceToAgent('user-1', 'mission-1', 'subtask-1', {
        agent_key: 'atlas',
        reason: 'Needs agent processing',
      }),
    ).resolves.toEqual({ ok: true, bounced_to_agent: 'atlas' })

    expect(missionOutboxService.enqueueOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'mission.subtask.execute.requested',
        payload: expect.objectContaining({ requested_by: 'human_bounce' }),
      }),
    )
    expect(missionsRepository.insertMissionLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event_type: 'mission.subtask.bounced_to_agent' }),
    )
  })

  it('reassigns unresolved human work to an active org member who accepts agent assignments', async () => {
    const { service, missionOutboxService, missionsRepository } = createHarness({
      mission_subtasks: [
        { data: assignedHumanSubtask, error: null },
        { data: null, error: null },
      ],
      missions: [{ data: baseMission, error: null }],
      org_members: [{ data: { user_id: 'user-2', status: 'active' }, error: null }],
      profiles: [{ data: { accepts_agent_assignments: true }, error: null }],
      __repositorySubtask: [{ data: assignedHumanSubtask }],
      __repositoryMission: [{ data: baseMission }],
      __repositoryMember: [{ data: { user_id: 'user-2', status: 'active' } }],
      __repositoryProfile: [{ data: { accepts_agent_assignments: true } }],
    })

    await expect(
      service.reassignHuman('user-1', 'mission-1', 'subtask-1', {
        user_id: 'user-2',
        reason: 'Better owner',
      }),
    ).resolves.toEqual({ ok: true, reassigned_to: 'user-2' })

    expect(missionOutboxService.enqueueOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'mission.subtask.awaiting_human.requested',
        payload: expect.objectContaining({
          assigned_user_id: 'user-2',
          requested_by: 'human_reassign',
        }),
      }),
    )
    expect(missionsRepository.insertMissionLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event_type: 'mission.subtask.reassigned_human' }),
    )
  })

  it('blocks a human subtask and notifies the mission owner', async () => {
    const { service, missionsRepository } = createHarness({
      mission_subtasks: [
        { data: assignedHumanSubtask, error: null },
        { data: null, error: null },
      ],
      missions: [{ data: baseMission, error: null }],
      user_notifications: [{ data: null, error: null }],
      __repositorySubtask: [{ data: assignedHumanSubtask }],
      __repositoryMission: [{ data: baseMission }],
    })

    await expect(
      service.blockHuman('user-1', 'mission-1', 'subtask-1', {
        reason: 'Missing access',
      }),
    ).resolves.toEqual({ ok: true })

    expect(missionsRepository.insertMissionLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event_type: 'mission.subtask.human_blocked',
        payload: expect.objectContaining({ reason: 'Missing access' }),
      }),
    )
  })
})
