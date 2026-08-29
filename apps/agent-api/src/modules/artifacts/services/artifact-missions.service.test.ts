import { describe, expect, it, vi } from 'vitest'
import { ArtifactMissionsService } from './artifact-missions.service'

type QueryResult = { data: unknown; error: { message: string } | null }

function makeQuery(result: QueryResult) {
  const chain: Record<string, any> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    in: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

function makeSupabase(resultsByTable: Record<string, QueryResult[]>) {
  const queries: Array<{ table: string; query: Record<string, any> }> = []
  const supabase = {
    from: vi.fn((table: string) => {
      const next = resultsByTable[table]?.shift()
      if (!next) throw new Error(`Unexpected table access: ${table}`)
      const query = makeQuery(next)
      queries.push({ table, query })
      return query
    }),
  }
  return { supabase, queries }
}

function makeMissionTarget(serviceClient: unknown) {
  return {
    serviceClient,
    isMissionSessionKey: vi.fn(() => true),
    parseAgentIdFromSessionKey: vi.fn(() => 'pm'),
    parseUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => 'org-1'),
    mainApiCall: vi.fn(),
  }
}

describe('ArtifactMissionsService', () => {
  it('persists the top-level playbook id inside mission input', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({ success: true })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    await handlers.create_mission(
      {
        title: 'IG Organic Story Ad',
        playbook_id: 'ig-organic-video-ad',
        input: {
          playbook_kickoff: {
            output_count: 1,
          },
        },
      },
      'mission-session',
    )

    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/missions',
      'mission-session',
      expect.objectContaining({
        title: 'IG Organic Story Ad',
        idempotency_key: expect.any(String),
        input: {
          playbook_id: 'ig-organic-video-ad',
          playbook_kickoff: {
            output_count: 1,
          },
        },
      }),
    )
  })

  it('creates a branch mission with the parent and client scope preserved', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({ success: true })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    await handlers.create_mission(
      {
        title: 'Client Lifecycle — Alternative launch path',
        parent_mission_id: 'mission-parent',
        campaign_id: 'campaign-1',
        space_id: 'space-1',
        brief: 'Branch from the approved strategy stage.',
      },
      'mission-session',
    )

    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/missions',
      'mission-session',
      expect.objectContaining({
        title: 'Client Lifecycle — Alternative launch path',
        parent_mission_id: 'mission-parent',
        campaign_id: 'campaign-1',
        space_id: 'space-1',
        brief: 'Branch from the approved strategy stage.',
      }),
    )
  })

  it('lists mission-session missions with manager visibility and subtask-assignee matches', async () => {
    const { supabase, queries } = makeSupabase({
      agents_registry: [
        {
          data: {
            agent_key: 'pm',
            level: 'manager',
            role: 'Marketing Manager',
            config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
          },
          error: null,
        },
        {
          data: [
            {
              agent_key: 'copywriter',
              role: 'Copywriter',
              config: { capability_domain: 'marketing' },
            },
            {
              agent_key: 'designer',
              role: 'Designer',
              config: { capability_domain: 'marketing' },
            },
            {
              agent_key: 'developer',
              role: 'Engineer',
              config: { capability_domain: 'developer' },
            },
          ],
          error: null,
        },
      ],
      missions: [
        {
          data: [{ id: 'mission-1', updated_at: '2026-06-01T00:00:00.000Z' }],
          error: null,
        },
        {
          data: [{ id: 'mission-2', updated_at: '2026-06-02T00:00:00.000Z' }],
          error: null,
        },
      ],
      mission_subtasks: [{ data: [{ mission_id: 'mission-2' }], error: null }],
    })
    const target = makeMissionTarget(supabase)
    const handlers = new ArtifactMissionsService().getHandlers(target)

    const result = await handlers.list_missions(
      { status: 'active', campaign_id: 'campaign-1', limit: '25' },
      'mission-session',
    )

    expect(result).toEqual([
      { id: 'mission-2', updated_at: '2026-06-02T00:00:00.000Z' },
      { id: 'mission-1', updated_at: '2026-06-01T00:00:00.000Z' },
    ])
    const missionQuery = queries.find(({ table }) => table === 'missions')?.query
    expect(missionQuery?.or).toHaveBeenCalledWith(
      'assigned_agent_key.in.(copywriter,designer),current_agent_key.in.(copywriter,designer)',
    )
    expect(missionQuery?.eq).toHaveBeenCalledWith('status', 'active')
    expect(missionQuery?.eq).toHaveBeenCalledWith('campaign_id', 'campaign-1')
    expect(missionQuery?.limit).toHaveBeenCalledWith(25)
    expect(target.mainApiCall).not.toHaveBeenCalled()
  })

  it('gets mission-session mission details with subtasks and logs from direct reads', async () => {
    const { supabase } = makeSupabase({
      agents_registry: [{ data: null, error: null }],
      missions: [
        {
          data: {
            id: 'mission-1',
            user_id: 'user-1',
            title: 'Launch',
            status: 'active',
          },
          error: null,
        },
      ],
      mission_subtasks: [{ data: [{ id: 'subtask-1', sort_order: 1 }], error: null }],
      missions_logs: [{ data: [{ id: 'log-1', event_type: 'created' }], error: null }],
    })
    const target = makeMissionTarget(supabase)
    const handlers = new ArtifactMissionsService().getHandlers(target)

    const result = await handlers.get_mission({ mission_id: 'mission-1' }, 'mission-session')

    expect(result).toEqual({
      id: 'mission-1',
      user_id: 'user-1',
      title: 'Launch',
      status: 'active',
      subtasks: [{ id: 'subtask-1', sort_order: 1 }],
      logs: [{ id: 'log-1', event_type: 'created' }],
    })
    expect(target.mainApiCall).not.toHaveBeenCalled()
  })

  it('lists mission-session deliverables from direct reads', async () => {
    const { supabase, queries } = makeSupabase({
      agents_registry: [{ data: null, error: null }],
      mission_deliverables: [
        {
          data: [{ id: 'deliverable-1', mission_id: 'mission-1', type: 'document' }],
          error: null,
        },
      ],
    })
    const target = makeMissionTarget(supabase)
    const handlers = new ArtifactMissionsService().getHandlers(target)

    const result = await handlers.get_mission_deliverables(
      { mission_id: 'mission-1' },
      'mission-session',
    )

    expect(result).toEqual([{ id: 'deliverable-1', mission_id: 'mission-1', type: 'document' }])
    const deliverablesQuery = queries.find(({ table }) => table === 'mission_deliverables')?.query
    expect(deliverablesQuery?.eq).toHaveBeenCalledWith('mission_id', 'mission-1')
    expect(deliverablesQuery?.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(target.mainApiCall).not.toHaveBeenCalled()
  })

  it('compiles a webinar Launch Bible through the mission export endpoint', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({
      success: true,
      deliverable_id: 'launch-bible-1',
      file: { webViewLink: 'https://docs.google.com/document/d/doc-1/edit' },
    })
    const handlers = new ArtifactMissionsService().getHandlers(target)
    const tabs = [
      { title: '0 - Overview', html: '<h1>Overview</h1>' },
      { title: '1 - ICP Sheet', html: '<h1>ICP</h1>' },
    ]

    const result = await handlers.compile_webinar_launch_bible(
      { mission_id: 'mission-1', title: 'Impact Webinar Launch Bible', tabs },
      'mission-session',
    )

    expect(result).toMatchObject({ success: true, deliverable_id: 'launch-bible-1' })
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/missions/mission-1/deliverables/export-google-doc',
      'mission-session',
      {
        title: 'Impact Webinar Launch Bible',
        tabs,
        deliverable_title: 'Task 16 — Webinar Launch Bible',
        source: 'webinar_launch_bible',
      },
    )
  })

  it('creates mission manager subtasks through the internal manager endpoint', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({ success: true, queued: true })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    const result = await handlers.create_mission_subtask(
      {
        mission_id: 'mission-1',
        idempotency_key: 'idempotency-1',
        subtask: {
          id: 'subtask-1',
          title: 'Draft the follow-up',
          assignTo: 'copywriter',
          dependsOn: ['subtask-0'],
          publishToTaskList: true,
          intent: {
            why: 'Needed',
            story: 'Story',
            sensory: 'Clear',
            endState: 'Done',
            ecology: 'Safe',
          },
        },
      },
      'mission-session',
    )

    expect(result).toEqual({ success: true, queued: true })
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/internal/missions/manager/append-subtasks',
      'mission-session',
      {
        mission_id: 'mission-1',
        user_id: 'user-1',
        org_id: 'org-1',
        idempotency_key: 'idempotency-1',
        subtasks: [
          {
            id: 'subtask-1',
            title: 'Draft the follow-up',
            assignTo: 'copywriter',
            dependsOn: ['subtask-0'],
            publishToTaskList: true,
            intent: {
              why: 'Needed',
              story: 'Story',
              sensory: 'Clear',
              endState: 'Done',
              ecology: 'Safe',
            },
          },
        ],
      },
    )
  })

  it('reassigns mission manager subtasks through the edit-subtask endpoint', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({ success: true })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    const result = await handlers.reassign_mission_subtask(
      {
        mission_id: 'mission-1',
        subtask_id: 'subtask-1',
        assigned_agent_key: 'designer',
        idempotency_key: 'reassign-1',
      },
      'mission-session',
    )

    expect(result).toEqual({ success: true })
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/internal/missions/manager/edit-subtask',
      'mission-session',
      {
        mission_id: 'mission-1',
        user_id: 'user-1',
        org_id: 'org-1',
        idempotency_key: 'reassign-1',
        subtask_id: 'subtask-1',
        assigned_agent_key: 'designer',
      },
    )
  })

  it('updates Mission step dependencies through the edit-subtask endpoint', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({ success: true })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    await handlers.edit_mission_subtask(
      {
        mission_id: 'mission-1',
        subtask_id: 'subtask-1',
        dependsOn: ['dependency-1', 'dependency-2'],
      },
      'mission-session',
    )

    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/internal/missions/manager/edit-subtask',
      'mission-session',
      expect.objectContaining({
        mission_id: 'mission-1',
        user_id: 'user-1',
        org_id: 'org-1',
        subtask_id: 'subtask-1',
        dependsOn: ['dependency-1', 'dependency-2'],
      }),
    )
  })

  it.each([
    {
      action: 'cancel_mission_subtask',
      input: { mission_id: 'mission-1', subtask_id: 'subtask-1' },
      path: 'cancel-subtask',
      payload: { subtask_id: 'subtask-1' },
    },
    {
      action: 'retry_mission_subtask',
      input: { mission_id: 'mission-1', subtask_id: 'subtask-1' },
      path: 'retry-subtask',
      payload: { subtask_id: 'subtask-1' },
    },
    {
      action: 'prepare_mission_replan',
      input: { mission_id: 'mission-1', reason: 'Restart from approved strategy.' },
      path: 'prepare-replan',
      payload: { reason: 'Restart from approved strategy.' },
    },
  ])('routes $action through the durable manager endpoint', async ({ action, input, path, payload }) => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({ success: true })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    await handlers[action]({ ...input, idempotency_key: `proof-${path}` }, 'mission-session')

    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      `/api/internal/missions/manager/${path}`,
      'mission-session',
      {
        mission_id: 'mission-1',
        user_id: 'user-1',
        org_id: 'org-1',
        ...payload,
        idempotency_key: `proof-${path}`,
      },
    )
  })

  it('approves missions by marking the mission status done', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({ success: true, status: 'done' })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    const result = await handlers.approve_mission({ mission_id: 'mission-1' }, 'mission-session')

    expect(result).toEqual({ success: true, status: 'done' })
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'PATCH',
      '/api/missions/mission-1/status',
      'mission-session',
      { status: 'done' },
    )
  })

  it('adds mission comments stamped with the acting agent key', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({ success: true, id: 'comment-1' })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    const result = await handlers.add_mission_comment(
      { mission_id: 'mission-1', message: 'Looks good' },
      'mission-session',
    )

    expect(result).toEqual({ success: true, id: 'comment-1' })
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/missions/mission-1/comment',
      'mission-session',
      { message: 'Looks good', agent_key: 'pm' },
    )
  })

  it('adds mission comments without an agent key when the session has none', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.parseAgentIdFromSessionKey.mockReturnValueOnce(null)
    target.mainApiCall.mockResolvedValueOnce({ success: true, id: 'comment-2' })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    await handlers.add_mission_comment(
      { mission_id: 'mission-1', message: 'Looks good' },
      'mission-session',
    )

    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/missions/mission-1/comment',
      'mission-session',
      { message: 'Looks good' },
    )
  })

  it('updates mission subtasks through the subtask patch endpoint', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({ success: true, id: 'subtask-1' })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    const result = await handlers.update_mission_subtask(
      {
        mission_id: 'mission-1',
        subtask_id: 'subtask-1',
        status: 'done',
        output: 'Finished',
      },
      'mission-session',
    )

    expect(result).toEqual({ success: true, id: 'subtask-1' })
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'PATCH',
      '/api/missions/mission-1/subtasks/subtask-1',
      'mission-session',
      { status: 'done', output: 'Finished' },
    )
  })

  it('trashes missions through the mission delete endpoint', async () => {
    const { supabase } = makeSupabase({})
    const target = makeMissionTarget(supabase)
    target.mainApiCall.mockResolvedValueOnce({ success: true })
    const handlers = new ArtifactMissionsService().getHandlers(target)

    const result = await handlers.trash_mission({ mission_id: 'mission-1' }, 'mission-session')

    expect(result).toEqual({ success: true })
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'DELETE',
      '/api/missions/mission-1',
      'mission-session',
    )
  })
})
