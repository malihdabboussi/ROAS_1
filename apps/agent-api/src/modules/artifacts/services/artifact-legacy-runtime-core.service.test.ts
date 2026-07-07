import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyRuntimeCoreService } from './artifact-legacy-runtime-core.service'

function makeTarget() {
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => null),
    isMissionSessionKey: vi.fn(() => false),
    getAccessTokenFromSessionKey: vi.fn(async () => 'access-token'),
    config: {
      get: vi.fn((key: string) => (key === 'MAIN_API_URL' ? 'https://api.example.test' : '')),
    },
  }
}

type QueryRecord = {
  table: string
  filters: Record<string, unknown>
  isFilters: Record<string, unknown>
  operation: 'insert' | 'update' | null
  orFilter: string | null
  orders: Array<{ column: string; options?: Record<string, unknown> }>
  limitValue: number | null
  payload: unknown
  selectColumns: string | undefined
}

function makeQueryClient(
  handler: (
    record: QueryRecord,
    terminal: 'maybeSingle' | 'single' | 'then',
  ) => Promise<{ data: unknown; error: unknown }> | { data: unknown; error: unknown },
) {
  const records: QueryRecord[] = []
  const client = {
    from: vi.fn((table: string) => {
      const record: QueryRecord = {
        table,
        filters: {},
        isFilters: {},
        operation: null,
        orFilter: null,
        orders: [],
        limitValue: null,
        payload: null,
        selectColumns: undefined,
      }
      records.push(record)
      const query: any = {
        select: vi.fn((columns?: string) => {
          record.selectColumns = columns
          return query
        }),
        eq: vi.fn((key: string, value: unknown) => {
          record.filters[key] = value
          return query
        }),
        is: vi.fn((key: string, value: unknown) => {
          record.isFilters[key] = value
          return query
        }),
        or: vi.fn((filter: string) => {
          record.orFilter = filter
          return query
        }),
        order: vi.fn((column: string, options?: Record<string, unknown>) => {
          record.orders.push({ column, options })
          return query
        }),
        limit: vi.fn((value: number) => {
          record.limitValue = value
          return query
        }),
        update: vi.fn((payload: unknown) => {
          record.operation = 'update'
          record.payload = payload
          return query
        }),
        insert: vi.fn((payload: unknown) => {
          record.operation = 'insert'
          record.payload = payload
          return query
        }),
        maybeSingle: vi.fn(() => handler(record, 'maybeSingle')),
        single: vi.fn(() => handler(record, 'single')),
        then: (
          resolve: (value: { data: unknown; error: unknown }) => unknown,
          reject?: (reason?: unknown) => unknown,
        ) => Promise.resolve(handler(record, 'then')).then(resolve, reject),
      }
      return query
    }),
  }
  return { client, records }
}

describe('ArtifactLegacyRuntimeCoreService mainApiCall error parsing', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('surfaces Nest validation message instead of generic Bad Request error', async () => {
    const service = new ArtifactLegacyRuntimeCoreService()
    const target = makeTarget()
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'Bad Request', message: 'query is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as unknown as typeof fetch

    await expect(
      service.mainApiCall(target, 'GET', '/api/integrations/scrapecreators/youtube/search', 's1'),
    ).rejects.toThrow('query is required')
  })

  it('surfaces shared Zod validation details instead of Validation failed labels', async () => {
    const service = new ArtifactLegacyRuntimeCoreService()
    const target = makeTarget()
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: 'Validation failed',
            message: 'Required',
            details: [{ path: 'query', message: 'Required' }],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    ) as unknown as typeof fetch

    await expect(
      service.mainApiCall(target, 'GET', '/api/integrations/slack/search', 's1'),
    ).rejects.toThrow('query: Required')
  })

  it('surfaces flattened field errors from success-false backend responses', async () => {
    const service = new ArtifactLegacyRuntimeCoreService()
    const target = makeTarget()
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid request',
            details: { fieldErrors: { path: ['Required'] }, formErrors: [] },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    ) as unknown as typeof fetch

    await expect(
      service.mainApiCall(target, 'GET', '/api/integrations/dropbox/files', 's1'),
    ).rejects.toThrow('path: Required')
  })

  it('keeps specific success-false error messages', async () => {
    const service = new ArtifactLegacyRuntimeCoreService()
    const target = makeTarget()
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: false, error: 'Invalid action slug' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as unknown as typeof fetch

    await expect(
      service.mainApiCall(target, 'POST', '/api/integrations/run', 's1'),
    ).rejects.toThrow('Invalid action slug')
  })

  it('denies mutating campaign actions when the org member lacks edit permission', async () => {
    const userQueries = makeQueryClient(async (record) => {
      if (record.table !== 'agents_registry') throw new Error(`Unexpected table ${record.table}`)
      return {
        data: {
          agent_key: 'copywriter',
          role: 'Copywriter',
          level: 'employee',
          config: {
            capability_profile: 'managed_domain',
            capability_domain: 'marketing',
          },
        },
        error: null,
      }
    })
    const serviceQueries = makeQueryClient(async (record) => {
      if (record.table === 'campaigns') {
        return { data: { user_id: 'owner-user', org_id: 'org-1' }, error: null }
      }
      if (record.table === 'org_members') {
        return { data: { id: 'member-1', role: 'member' }, error: null }
      }
      if (record.table === 'org_campaign_permissions') {
        return { data: { permission: 'view' }, error: null }
      }
      throw new Error(`Unexpected table ${record.table}`)
    })
    const service = new ArtifactLegacyRuntimeCoreService()

    const decision = await service.authorizeAction(
      {
        resolveUserId: () => 'user-1',
        resolveOrgId: () => 'org-1',
        parseAgentIdFromSessionKey: () => 'copywriter',
        parseConversationId: () => 'conv-1',
        requestContext: { get: vi.fn(() => ({ campaignId: 'campaign-1' })) },
        getUserClient: vi.fn(async () => userQueries.client),
        svc: { client: serviceQueries.client },
      },
      'create_offer',
      {},
      'session-1',
    )

    expect(decision).toEqual({
      allowed: false,
      reason: 'Edit access required for this campaign.',
    })
    expect(serviceQueries.records.map((record) => record.table)).toEqual([
      'campaigns',
      'org_members',
      'org_campaign_permissions',
    ])
  })

  it('authorizes Loop flow build actions without a personal agents_registry row', async () => {
    const userQueries = makeQueryClient(async (record) => {
      if (record.table !== 'agents_registry') throw new Error(`Unexpected table ${record.table}`)
      return { data: null, error: null }
    })
    const service = new ArtifactLegacyRuntimeCoreService()

    const decision = await service.authorizeAction(
      {
        resolveUserId: () => 'user-1',
        resolveOrgId: () => null,
        parseAgentIdFromSessionKey: () => 'loop',
        parseConversationId: () => 'conv-1',
        requestContext: { get: vi.fn(() => null) },
        getUserClient: vi.fn(async () => userQueries.client),
      },
      'get_flow_build_context',
      { space_id: 'space-1' },
      'agent:loop:conv-1',
    )

    expect(decision).toEqual({ allowed: true })
    expect(userQueries.records.length).toBeGreaterThanOrEqual(1)
  })

  it('resolves mission context from subtask session keys', async () => {
    const missionId = '11111111-1111-4111-8111-111111111111'
    const subtaskId = '22222222-2222-4222-8222-222222222222'
    const { client, records } = makeQueryClient(async (record) => {
      if (record.table === 'mission_subtasks') {
        return { data: { mission_id: missionId, user_id: 'user-1' }, error: null }
      }
      if (record.table === 'missions') {
        return {
          data: {
            id: missionId,
            user_id: 'user-1',
            campaign_id: 'campaign-1',
            org_id: 'org-1',
          },
          error: null,
        }
      }
      throw new Error(`Unexpected table ${record.table}`)
    })
    const service = new ArtifactLegacyRuntimeCoreService()

    await expect(
      service.resolveMissionContext(
        { serviceClient: client, parseConversationId: vi.fn() },
        `user-1:agent:subtask:any:any:${subtaskId}`,
        'user-1',
      ),
    ).resolves.toEqual({ missionId, campaignId: 'campaign-1', orgId: 'org-1' })

    expect(records[0]).toMatchObject({
      table: 'mission_subtasks',
      filters: { id: subtaskId },
    })
    expect(records[1]).toMatchObject({
      table: 'missions',
      filters: { id: missionId },
    })
  })

  it('persists mission deliverable updates with normalized metadata and return shape', async () => {
    const { client, records } = makeQueryClient(async (record) => {
      if (record.table !== 'mission_deliverables') {
        throw new Error(`Unexpected table ${record.table}`)
      }
      return {
        data: {
          id: 'deliverable-1',
          type: 'video',
          title: 'Launch video',
          file_url: 'https://cdn.example/video.mp4',
          file_name: 'video.mp4',
          metadata: record.payload && typeof record.payload === 'object'
            ? (record.payload as Record<string, unknown>).metadata
            : {},
        },
        error: null,
      }
    })
    const service = new ArtifactLegacyRuntimeCoreService()

    const result = await service.persistMissionDeliverable(
      { serviceClient: client, logger: { log: vi.fn() } },
      {
        missionId: 'mission-1',
        userId: 'user-1',
        campaignId: 'campaign-1',
        orgId: 'org-1',
        agentKey: 'designer',
        type: 'video',
        title: 'Launch video',
        fileUrl: 'https://cdn.example/video.mp4',
        fileName: 'video.mp4',
        sourceAction: 'generate_video',
        metadata: {
          media_generation_status: 'succeeded',
          media_job_id: 'job-1',
          entity_id: 'asset-1',
          entity_table: 'media_assets',
        },
        source: 'chat',
        updateId: 'deliverable-1',
      },
    )

    expect(result).toEqual({
      success: true,
      id: 'deliverable-1',
      deliverable_id: 'deliverable-1',
      type: 'video',
      title: 'Launch video',
      file_url: 'https://cdn.example/video.mp4',
      file_name: 'video.mp4',
      metadata: expect.objectContaining({
        agent_key: 'designer',
        media_job_id: 'job-1',
        source: 'agent_tool',
        source_action: 'generate_video',
      }),
    })
    expect(records[0]).toMatchObject({
      operation: 'update',
      filters: { id: 'deliverable-1', mission_id: 'mission-1', user_id: 'user-1' },
    })
    expect(records[0].payload).toMatchObject({
      campaign_id: 'campaign-1',
      generation_job_id: 'job-1',
      generation_status: 'succeeded',
      org_id: 'org-1',
      source: 'chat',
    })
  })

  it('handles mission-session direct mission and skill routes without proxying', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-19T07:45:00.000Z'))
    const missionId = '33333333-3333-4333-8333-333333333333'
    const { client, records } = makeQueryClient(async (record, terminal) => {
      if (record.table === 'missions' && terminal === 'then') {
        return { data: [{ id: 'mission-list-1' }], error: null }
      }
      if (record.table === 'missions' && terminal === 'single') {
        return { data: { id: missionId, ...(record.payload as Record<string, unknown>) }, error: null }
      }
      if (record.table === 'missions_logs') {
        return { data: { id: 'log-1', ...(record.payload as Record<string, unknown>) }, error: null }
      }
      if (record.table === 'agent_skills') {
        return {
          data: [
            { id: 'skill-1', agent_key: 'copywriter' },
            { id: 'skill-2', agent_key: '*' },
          ],
          error: null,
        }
      }
      throw new Error(`Unexpected table ${record.table}`)
    })
    const service = new ArtifactLegacyRuntimeCoreService()
    const target = {
      serviceClient: client,
      config: { get: vi.fn(() => '') },
    }

    await expect(
      service.mainApiCallMissionSessionDirect(
        target,
        'GET',
        '/api/missions?status=inbox',
        'user-1',
        undefined,
        'org-1',
      ),
    ).resolves.toEqual([{ id: 'mission-list-1' }])
    await expect(
      service.mainApiCallMissionSessionDirect(
        target,
        'PATCH',
        `/api/missions/${missionId}/status`,
        'user-1',
        { status: 'done', output: { ok: true } },
        'org-1',
      ),
    ).resolves.toMatchObject({ id: missionId, status: 'done', completed_at: '2026-06-19T07:45:00.000Z' })
    await expect(
      service.mainApiCallMissionSessionDirect(
        target,
        'POST',
        `/api/missions/${missionId}/comment`,
        'user-1',
        { message: 'Looks good' },
        'org-1',
      ),
    ).resolves.toMatchObject({ id: 'log-1', event_type: 'user.comment' })
    await expect(
      service.mainApiCallMissionSessionDirect(
        target,
        'POST',
        '/api/missions',
        'user-1',
        { title: 'New mission', input: { brief: true } },
        'org-1',
      ),
    ).resolves.toMatchObject({ id: missionId, title: 'New mission', status: 'inbox' })
    await expect(
      service.mainApiCallMissionSessionDirect(
        target,
        'GET',
        '/api/missions/agents/copywriter/skills',
        'user-1',
      ),
    ).resolves.toEqual([
      { id: 'skill-1', agent_key: 'copywriter' },
      { id: 'skill-2', agent_key: '*' },
    ])

    expect(records.map((record) => record.table)).toEqual([
      'missions',
      'missions',
      'missions_logs',
      'missions',
      'agent_skills',
    ])
    expect(records[0]).toMatchObject({
      filters: { user_id: 'user-1' },
      isFilters: {},
      limitValue: 30,
    })
    expect(records[1].payload).toMatchObject({
      completed_at: '2026-06-19T07:45:00.000Z',
      output: { ok: true },
      status: 'done',
      updated_at: '2026-06-19T07:45:00.000Z',
    })
    expect(records[2].payload).toMatchObject({
      event_type: 'user.comment',
      mission_id: missionId,
      org_id: 'org-1',
      payload: { message: 'Looks good' },
      user_id: 'user-1',
    })
    expect(records[3].payload).toMatchObject({
      correlation_id: expect.any(String),
      org_id: 'org-1',
      retry_count: 0,
      status: 'inbox',
      title: 'New mission',
      user_id: 'user-1',
    })
    expect(records[4]).toMatchObject({
      filters: { user_id: 'user-1' },
      orFilter: 'agent_key.eq.copywriter,agent_key.eq.*',
    })
  })
})
