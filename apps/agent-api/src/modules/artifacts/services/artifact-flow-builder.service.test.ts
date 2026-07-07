import { describe, expect, it, vi } from 'vitest'
import { ArtifactFlowBuilderService } from './artifact-flow-builder.service'

type QueryRecord = {
  table: string
  filters: Record<string, unknown>
  orFilter: string | null
  operation: 'insert' | 'update' | null
  payload: unknown
  selectColumns: string | undefined
  orders: Array<{ column: string; options?: Record<string, unknown> }>
  limitValue: number | undefined
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
        orFilter: null,
        operation: null,
        payload: null,
        selectColumns: undefined,
        orders: [],
        limitValue: undefined,
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
        insert: vi.fn((payload: unknown) => {
          record.operation = 'insert'
          record.payload = payload
          return query
        }),
        update: vi.fn((payload: unknown) => {
          record.operation = 'update'
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

function makeTarget(client: unknown) {
  const activeBuilds = new Map<string, unknown>()
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    getUserClient: vi.fn(async () => client),
    requestContext: {
      getActiveFlowBuild: vi.fn((conversationId: string) => activeBuilds.get(conversationId)),
      setActiveFlowBuild: vi.fn((conversationId: string, value: unknown) => {
        activeBuilds.set(conversationId, value)
      }),
    },
  }
}

const sessionKey = 'agent:11111111-1111-1111-1111-111111111111'

describe('ArtifactFlowBuilderService', () => {
  it('loads build context from space, existing flows, and blueprints', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'spaces') {
        return {
          data: {
            id: 'space-1',
            title: 'Launch Space',
            user_id: 'owner-1',
            org_id: 'org-1',
            schema: {
              views: [
                { id: 'view-1', title: 'Tasks', fields: [{ id: 'status', label: 'Status' }] },
              ],
            },
          },
          error: null,
        }
      }
      if (record.table === 'space_automations') {
        return {
          data: [
            {
              id: 'flow-1',
              name: 'Welcome flow',
              enabled: true,
              is_draft: false,
              trigger: { type: 'task_created' },
              actions: [{ type: 'create_task' }],
              updated_at: '2026-06-19T00:00:00.000Z',
            },
          ],
          error: null,
        }
      }
      if (record.table === 'project_flow_action_blueprint') {
        return { data: [{ id: 'blueprint-1', name: 'Custom action' }], error: null }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactFlowBuilderService().getHandlers(makeTarget(client))

    const result = (await handlers.get_flow_build_context(
      { space_id: 'space-1', query: 'task' },
      sessionKey,
    )) as Record<string, any>

    expect(result.success).toBe(true)
    expect(result.context.space).toMatchObject({ id: 'space-1', title: 'Launch Space' })
    expect(result.context.workflow_capabilities).toMatchObject({
      flow_capability_total: expect.any(Number),
      agent_action_total: expect.any(Number),
      results: expect.any(Array),
    })
    expect(
      result.context.workflow_capabilities.results.some(
        (capability: Record<string, unknown>) => capability.id === 'agent_action.create_task',
      ),
    ).toBe(true)
    expect(result.context.existing_flows).toEqual([
      expect.objectContaining({
        id: 'flow-1',
        name: 'Welcome flow',
        trigger_type: 'task_created',
        action_types: ['create_task'],
      }),
    ])
    expect(result.context.blueprints).toEqual([{ id: 'blueprint-1', name: 'Custom action' }])
    expect(records.find((record) => record.table === 'spaces')).toMatchObject({
      filters: { id: 'space-1' },
      selectColumns: 'id, title, user_id, org_id, schema',
    })
    expect(
      records.find((record) => record.table === 'project_flow_action_blueprint'),
    ).toMatchObject({
      orFilter: 'space_id.eq.space-1,space_id.is.null',
      orders: [{ column: 'updated_at', options: { ascending: false } }],
      limitValue: 20,
    })
  })

  it('creates a clarification session and persists open clarification rows', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'spaces') {
        return { data: { id: 'space-1', org_id: 'org-1' }, error: null }
      }
      if (record.table === 'project_flow_build_session' && record.operation === null) {
        return { data: null, error: null }
      }
      if (record.table === 'project_flow_build_session' && record.operation === 'insert') {
        return {
          data: {
            id: 'session-1',
            space_id: 'space-1',
            plan: {},
            trace_events: [],
          },
          error: null,
        }
      }
      if (record.table === 'project_flow_build_session' && record.operation === 'update') {
        return {
          data: {
            id: 'session-1',
            space_id: 'space-1',
            status: 'clarifying',
            trace_events: [],
          },
          error: null,
        }
      }
      if (record.table === 'project_flow_build_clarification') {
        return { data: null, error: null }
      }
      return { data: null, error: null }
    })
    const target = makeTarget(client)
    const handlers = new ArtifactFlowBuilderService().getHandlers(target)

    const result = (await handlers.create_flow_clarification(
      {
        space_id: 'space-1',
        intent: 'Clarify customer handoff',
        questions: [
          {
            id: 'q1',
            text: 'Which status should trigger?',
            options: [{ id: 'done', label: 'Done' }],
          },
        ],
      },
      sessionKey,
    )) as Record<string, any>

    expect(result).toMatchObject({
      success: true,
      render_mode: 'chat',
      clarification: {
        title: 'Quick question',
        questions: [expect.objectContaining({ id: 'q1', text: 'Which status should trigger?' })],
      },
    })
    expect(
      records.find(
        (record) => record.table === 'project_flow_build_session' && record.operation === 'insert',
      ),
    ).toMatchObject({
      payload: expect.objectContaining({
        org_id: 'org-1',
        space_id: 'space-1',
        created_by: 'user-1',
        status: 'clarifying',
        intent: 'Clarify customer handoff',
      }),
    })
    expect(
      records.find((record) => record.table === 'project_flow_build_clarification'),
    ).toMatchObject({
      operation: 'insert',
      payload: [
        expect.objectContaining({
          session_id: 'session-1',
          org_id: 'org-1',
          space_id: 'space-1',
          created_by: 'user-1',
          status: 'open',
        }),
      ],
    })
    expect(target.requestContext.setActiveFlowBuild).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      expect.objectContaining({ sessionId: 'session-1', spaceId: 'space-1' }),
    )
  })

  it('compiles a valid plan into a disabled draft flow and updates the session', async () => {
    const storedPlan = {
      id: 'session-1',
      name: 'Create task follow-up',
      intent: 'Create a task when a task appears',
      status: 'validated',
      trigger: {
        id: 'trigger-0',
        kind: 'trigger',
        title: 'Task created',
        description: 'Task created',
        source: 'premade',
        capability_id: 'trigger.task_created',
        payload: { type: 'task_created' },
        missing_fields: [],
        compatibility_warnings: [],
      },
      actions: [
        {
          id: 'action-1',
          kind: 'action',
          title: 'Create task',
          description: 'Create task',
          source: 'premade',
          capability_id: 'action.create_task',
          payload: { type: 'create_task', title_template: 'Follow up' },
          missing_fields: [],
          compatibility_warnings: [],
        },
      ],
      trace_events: [{ type: 'capabilities_searched', message: 'Searched' }],
      validation_errors: [],
    }
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'project_flow_build_session' && record.operation === null) {
        return {
          data: {
            id: 'session-1',
            space_id: 'space-1',
            status: 'validated',
            plan: storedPlan,
            trace_events: storedPlan.trace_events,
          },
          error: null,
        }
      }
      if (record.table === 'spaces') {
        return { data: { id: 'space-1', user_id: 'owner-1', org_id: 'org-1' }, error: null }
      }
      if (record.table === 'space_automations') {
        return { data: { id: 'flow-1', name: 'Create task follow-up' }, error: null }
      }
      if (record.table === 'project_flow_build_session' && record.operation === 'update') {
        return {
          data: {
            id: 'session-1',
            space_id: 'space-1',
            status: 'compiled',
            automation_id: 'flow-1',
            plan: { ...storedPlan, status: 'compiled', automation_id: 'flow-1' },
          },
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactFlowBuilderService().getHandlers(makeTarget(client))

    const result = (await handlers.compile_flow_plan(
      { space_id: 'space-1', session_id: 'session-1' },
      sessionKey,
    )) as Record<string, any>

    expect(result).toMatchObject({
      success: true,
      flow: { id: 'flow-1', name: 'Create task follow-up' },
      plan: expect.objectContaining({ status: 'compiled', automation_id: 'flow-1' }),
      validation: { valid: true, errors: [] },
    })
    expect(records.find((record) => record.table === 'space_automations')).toMatchObject({
      operation: 'insert',
      payload: expect.objectContaining({
        space_id: 'space-1',
        user_id: 'owner-1',
        org_id: 'org-1',
        created_by: 'user-1',
        name: 'Create task follow-up',
        enabled: false,
        is_draft: true,
      }),
    })
    expect(
      records.find(
        (record) =>
          record.table === 'project_flow_build_session' &&
          record.operation === 'update' &&
          record.payload &&
          typeof record.payload === 'object' &&
          'automation_id' in (record.payload as Record<string, unknown>),
      ),
    ).toMatchObject({
      filters: { space_id: 'space-1', id: 'session-1' },
      payload: expect.objectContaining({
        automation_id: 'flow-1',
        status: 'compiled',
      }),
    })
  })

  it('names and compiles into an existing untitled target draft instead of creating a duplicate', async () => {
    const storedPlan = {
      id: 'session-1',
      name: 'Create task follow-up',
      intent: 'Create a task when a task appears',
      status: 'validated',
      target_automation_id: 'draft-1',
      trigger: {
        id: 'trigger-0',
        kind: 'trigger',
        title: 'Task created',
        description: 'Task created',
        source: 'premade',
        capability_id: 'trigger.task_created',
        payload: { type: 'task_created' },
        missing_fields: [],
        compatibility_warnings: [],
      },
      actions: [
        {
          id: 'action-1',
          kind: 'action',
          title: 'Create task',
          description: 'Create task',
          source: 'premade',
          capability_id: 'action.create_task',
          payload: { type: 'create_task', title_template: 'Follow up' },
          missing_fields: [],
          compatibility_warnings: [],
        },
      ],
      trace_events: [{ type: 'capabilities_searched', message: 'Searched' }],
      validation_errors: [],
    }
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'project_flow_build_session' && record.operation === null) {
        return {
          data: {
            id: 'session-1',
            space_id: 'space-1',
            status: 'validated',
            plan: storedPlan,
            trace_events: storedPlan.trace_events,
          },
          error: null,
        }
      }
      if (record.table === 'space_automations' && record.operation === null) {
        return {
          data: { id: 'draft-1', name: 'Untitled flow draft', enabled: false, is_draft: true },
          error: null,
        }
      }
      if (record.table === 'space_automations' && record.operation === 'update') {
        return {
          data: {
            id: 'draft-1',
            name: 'Create task follow-up',
            enabled: false,
            is_draft: true,
          },
          error: null,
        }
      }
      if (record.table === 'project_flow_build_session' && record.operation === 'update') {
        return {
          data: {
            id: 'session-1',
            space_id: 'space-1',
            status: 'compiled',
            automation_id: 'draft-1',
            plan: { ...storedPlan, status: 'compiled', automation_id: 'draft-1' },
          },
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactFlowBuilderService().getHandlers(makeTarget(client))

    const result = (await handlers.compile_flow_plan(
      { space_id: 'space-1', session_id: 'session-1' },
      sessionKey,
    )) as Record<string, any>

    expect(result).toMatchObject({
      success: true,
      flow: { id: 'draft-1', name: 'Create task follow-up' },
      plan: expect.objectContaining({ status: 'compiled', automation_id: 'draft-1' }),
    })
    expect(records.find((record) => record.table === 'space_automations' && record.operation === 'insert')).toBeUndefined()
    expect(records.find((record) => record.table === 'space_automations' && record.operation === 'update')).toMatchObject({
      filters: { space_id: 'space-1', id: 'draft-1' },
      payload: expect.objectContaining({
        name: 'Create task follow-up',
        is_draft: true,
        enabled: false,
      }),
    })
  })

  it('creates and activates flow blueprints with validation preserved', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'spaces') {
        return { data: { id: 'space-1', org_id: 'org-1' }, error: null }
      }
      if (record.table === 'project_flow_action_blueprint' && record.operation === 'insert') {
        return {
          data: {
            id: 'blueprint-1',
            status: 'draft',
            action_template: { type: 'create_task', title_template: 'Follow up' },
          },
          error: null,
        }
      }
      if (record.table === 'project_flow_action_blueprint' && record.operation === null) {
        return {
          data: {
            id: 'blueprint-1',
            status: 'draft',
            action_template: { type: 'create_task', title_template: 'Follow up' },
          },
          error: null,
        }
      }
      if (record.table === 'project_flow_action_blueprint' && record.operation === 'update') {
        return {
          data: {
            id: 'blueprint-1',
            status: 'active',
            action_template: { type: 'create_task', title_template: 'Follow up' },
          },
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactFlowBuilderService().getHandlers(makeTarget(client))

    const created = await handlers.create_flow_blueprint_draft(
      {
        space_id: 'space-1',
        name: 'Follow-up task',
        action_template: { type: 'create_task', title_template: 'Follow up' },
      },
      sessionKey,
    )
    const activated = await handlers.activate_flow_blueprint(
      { blueprint_id: 'blueprint-1' },
      sessionKey,
    )

    expect(created).toMatchObject({
      success: true,
      blueprint: { id: 'blueprint-1', status: 'draft' },
      validation: { valid: true, errors: [] },
    })
    expect(activated).toMatchObject({
      success: true,
      blueprint: { id: 'blueprint-1', status: 'active' },
      validation: { valid: true, errors: [] },
    })
    expect(
      records.find(
        (record) =>
          record.table === 'project_flow_action_blueprint' && record.operation === 'insert',
      ),
    ).toMatchObject({
      payload: expect.objectContaining({
        org_id: 'org-1',
        space_id: 'space-1',
        created_by: 'user-1',
        name: 'Follow-up task',
        status: 'draft',
        category: 'Custom',
      }),
    })
    expect(
      records.find(
        (record) =>
          record.table === 'project_flow_action_blueprint' && record.operation === 'update',
      ),
    ).toMatchObject({
      filters: { id: 'blueprint-1' },
      payload: expect.objectContaining({ status: 'active' }),
    })
  })
})
