import { describe, expect, it, vi } from 'vitest'
import { ArtifactAgentDelegationService } from './artifact-agent-delegation.service'

type QueryRecord = {
  table: string
  filters: Record<string, unknown>
  isFilters: Record<string, unknown>
  operation: 'insert' | 'update' | 'upsert' | null
  orFilter: string | null
  payload: unknown
  upsertOptions: Record<string, unknown> | undefined
  selectColumns: string | undefined
  orders: Array<{ column: string; options?: Record<string, unknown> }>
  limitValue: number | null
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
        payload: null,
        upsertOptions: undefined,
        selectColumns: undefined,
        orders: [],
        limitValue: null,
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
        in: vi.fn((key: string, value: unknown[]) => {
          record.filters[`in:${key}`] = value
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
        neq: vi.fn((key: string, value: unknown) => {
          record.filters[`neq:${key}`] = value
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
        upsert: vi.fn((payload: unknown, options?: Record<string, unknown>) => {
          record.operation = 'upsert'
          record.payload = payload
          record.upsertOptions = options
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

function makeTarget(input: {
  userClient: unknown
  serviceClient?: unknown
  configValues?: Record<string, string>
}) {
  return {
    serviceClient: input.serviceClient ?? {},
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => null),
    parseAgentIdFromSessionKey: vi.fn(() => 'caller-agent'),
    parseConversationId: vi.fn(() => 'conversation-1'),
    getUserClient: vi.fn(async () => input.userClient),
    config: {
      get: vi.fn((key: string) => input.configValues?.[key] ?? ''),
    },
  }
}

function makeGatewayClient(responses: string[]) {
  const requests: Array<Record<string, unknown>> = []
  let responseIndex = 0
  return {
    requests,
    client: {
      openResponsesStream: vi.fn(async (request: Record<string, unknown>) => {
        requests.push(request)
        const output = responses[responseIndex++] ?? responses.at(-1) ?? ''
        const encoder = new TextEncoder()
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                [
                  `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: output })}`,
                  'data: [DONE]',
                  '',
                ].join('\n'),
              ),
            )
            controller.close()
          },
        })
        return stream.getReader()
      }),
    },
  }
}

describe('ArtifactAgentDelegationService', () => {
  it('passes the originating chat evidence into delegated work', async () => {
    const user = makeQueryClient((record) => {
      if (record.table === 'agents_registry' && record.filters.agent_key === 'delegator') {
        return {
          data: {
            agent_key: 'delegator',
            name: 'Delegator',
            role: 'Delegation Manager',
            image_url: null,
          },
          error: null,
        }
      }
      if (record.table === 'agents_registry' && record.filters.agent_key === 'caller-agent') {
        return { data: { image_url: null, role: 'Lead', name: 'Lead Agent' }, error: null }
      }
      return { data: null, error: null }
    })
    const serviceClient = makeQueryClient((record) => {
      if (record.table === 'conversations') {
        return {
          data: {
            id: 'conversation-1',
            title: 'Impact Elite GoHighLevel Workflows',
            metadata: { space_id: 'space-1', campaign_id: 'campaign-1' },
          },
          error: null,
        }
      }
      if (record.table === 'messages') {
        return {
          data: [
            {
              role: 'assistant',
              content: 'Created task task-123 with the First 10 Minutes hot-potato workflow.',
              created_at: '2026-07-29T18:02:00.000Z',
            },
            {
              role: 'user',
              content: 'Use the July 29 Fathom call for the Impact Elite GHL workflow.',
              created_at: '2026-07-29T18:01:00.000Z',
            },
          ],
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const gateway = makeGatewayClient(['Delegation completed from the supplied call evidence.'])
    const service = new ArtifactAgentDelegationService({ gatewayClient: gateway.client as any })
    const handlers = service.getHandlers(
      makeTarget({
        userClient: user.client,
        serviceClient: serviceClient.client,
        configValues: {
          OPENCLAW_GATEWAY_URL: 'https://gateway.example.test',
          OPENCLAW_GATEWAY_TOKEN: 'token',
        },
      }),
    )

    const result = await handlers.delegate_to_agent(
      {
        target_agent_key: 'delegator',
        task_description: 'Delegate the GHL workflow implementation.',
      },
      'agent:caller',
    )

    expect(result).toMatchObject({ success: true, delegation_status: 'completed' })
    const body = gateway.requests[0]?.body as {
      input: Array<{ role: string; content: string }>
      metadata: Record<string, unknown>
    }
    expect(body.input[0]).toMatchObject({ role: 'developer' })
    expect(body.input[0]?.content).toContain('Impact Elite GoHighLevel Workflows')
    expect(body.input[0]?.content).toContain('task-123')
    expect(body.input[0]?.content).toContain('space-1')
    expect(body.input.at(-1)).toEqual({
      type: 'message',
      role: 'user',
      content: 'Delegate the GHL workflow implementation.',
    })
    expect(body.metadata).toMatchObject({
      source_conversation_id: 'conversation-1',
      source_space_id: 'space-1',
      source_campaign_id: 'campaign-1',
    })
  })

  it('corrects a missing-call response when no recording source was checked', async () => {
    const user = makeQueryClient((record) => {
      if (record.table === 'agents_registry' && record.filters.agent_key === 'delegator') {
        return {
          data: {
            agent_key: 'delegator',
            name: 'Delegator',
            role: 'Delegation Manager',
            image_url: null,
          },
          error: null,
        }
      }
      if (record.table === 'agents_registry' && record.filters.agent_key === 'caller-agent') {
        return { data: { image_url: null, role: 'Lead', name: 'Lead Agent' }, error: null }
      }
      return { data: null, error: null }
    })
    const serviceClient = makeQueryClient((record) => {
      if (record.table === 'conversations') {
        return {
          data: { id: 'conversation-1', title: 'GHL call', metadata: {} },
          error: null,
        }
      }
      if (record.table === 'messages') return { data: [], error: null }
      return { data: null, error: null }
    })
    const gateway = makeGatewayClient([
      'I cannot find the July 29 call. Send the recording link.',
      'I found the call and completed the implementation brief.',
    ])
    const service = new ArtifactAgentDelegationService({ gatewayClient: gateway.client as any })
    const handlers = service.getHandlers(
      makeTarget({
        userClient: user.client,
        serviceClient: serviceClient.client,
        configValues: {
          OPENCLAW_GATEWAY_URL: 'https://gateway.example.test',
          OPENCLAW_GATEWAY_TOKEN: 'token',
        },
      }),
    )

    const result = await handlers.delegate_to_agent(
      {
        target_agent_key: 'delegator',
        task_description: 'Use the July 29 Fathom call to delegate the GHL work.',
      },
      'agent:caller',
    )

    expect(gateway.requests).toHaveLength(2)
    const retryBody = gateway.requests[1]?.body as {
      input: Array<{ role: string; content: string }>
    }
    expect(retryBody.input.at(-1)?.content).toContain('check the connected recording provider')
    expect(result).toMatchObject({
      success: true,
      response: 'I found the call and completed the implementation brief.',
    })
  })

  it('allows campaign-scoped delegation to Vibey without campaign membership', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'agents_registry' && record.filters.agent_key === 'vibey') {
        return {
          data: { agent_key: 'vibey', name: 'Vibey', role: 'CEO', image_url: null },
          error: null,
        }
      }
      if (record.table === 'agents_registry' && record.filters.agent_key === 'caller-agent') {
        return { data: { image_url: null, role: 'Meta Ads Manager', name: 'Blaze' }, error: null }
      }
      return { data: null, error: null }
    })
    const serviceClient = makeQueryClient(() => ({ data: null, error: null }))
    const service = new ArtifactAgentDelegationService()
    const handlers = service.getHandlers(
      makeTarget({ userClient: client, serviceClient: serviceClient.client }),
    )

    const result = await handlers.delegate_to_agent(
      { target_agent_key: 'vibey', task_description: 'Create the Ads Research mission' },
      'agent:ads_manager::campaign:campaign-1',
    )

    expect(result).toMatchObject({ success: false, error: 'Agent gateway not configured' })
    expect(records.some((record) => record.table === 'campaign_agents')).toBe(false)
  })

  it('asks the caller to assign an existing agent when campaign membership is missing', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'agents_registry' && record.filters.agent_key === 'writer') {
        return {
          data: {
            agent_key: 'writer',
            name: 'Writer',
            role: 'Copywriter',
            image_url: 'https://cdn.example/writer.png',
          },
          error: null,
        }
      }
      if (record.table === 'agents_registry' && record.filters.agent_key === 'caller-agent') {
        return { data: { image_url: null, role: 'Lead', name: 'Lead Agent' }, error: null }
      }
      if (record.table === 'campaign_agents') return { data: null, error: null }
      return { data: null, error: null }
    })
    const service = new ArtifactAgentDelegationService()
    const handlers = service.getHandlers(makeTarget({ userClient: client }))

    const result = await handlers.ask_agent(
      { target_agent_key: 'writer', prompt: 'Review this' },
      'agent:caller::campaign:campaign-1',
    )

    expect(result).toEqual({
      success: true,
      delegation_status: 'needs_assign',
      agent: { agent_key: 'writer', name: 'Writer', role: 'Copywriter' },
      campaign_id: 'campaign-1',
      message: 'Writer is on the team but not assigned to this campaign. Assign them first.',
    })
    expect(records.find((record) => record.table === 'campaign_agents')?.filters).toMatchObject({
      campaign_id: 'campaign-1',
      agent_key: 'writer',
    })
  })

  it('returns current roster and templates when the requested agent is not found', async () => {
    const { client } = makeQueryClient((record) => {
      if (record.table === 'agent_employee_templates' && record.orFilter) {
        return { data: [], error: null }
      }
      if (record.table === 'agents_registry' && !record.filters.agent_key) {
        return {
          data: [{ agent_key: 'designer', name: 'Designer', role: 'Designer' }],
          error: null,
        }
      }
      if (record.table === 'agent_employee_templates' && !record.orFilter) {
        return {
          data: [{ role_key: 'copywriter', default_name: 'Copywriter', role: 'Copywriter' }],
          error: null,
        }
      }
      if (record.table === 'agents_registry' && record.filters.agent_key === 'caller-agent') {
        return { data: { image_url: null, role: 'Lead', name: 'Lead Agent' }, error: null }
      }
      return { data: null, error: null }
    })
    const service = new ArtifactAgentDelegationService()
    const handlers = service.getHandlers(makeTarget({ userClient: client }))

    const result = await handlers.ask_agent(
      { target_agent_key: 'missing', prompt: 'Help' },
      'agent:caller',
    )

    expect(result).toMatchObject({
      success: false,
      error: 'No agent or role matching "missing" found.',
      current_team: [{ agent_key: 'designer', name: 'Designer', role: 'Designer' }],
      available_templates: [
        { role_key: 'copywriter', default_name: 'Copywriter', role_title: 'Copywriter' },
      ],
    })
  })

  it('records a failed delegation when gateway configuration is missing', async () => {
    const user = makeQueryClient((record) => {
      if (record.table === 'agents_registry' && record.filters.agent_key === 'writer') {
        return {
          data: { agent_key: 'writer', name: 'Writer', role: 'Copywriter', image_url: null },
          error: null,
        }
      }
      if (record.table === 'agents_registry' && record.filters.agent_key === 'caller-agent') {
        return { data: { image_url: null, role: 'Lead', name: 'Lead Agent' }, error: null }
      }
      return { data: null, error: null }
    })
    const serviceClient = makeQueryClient(() => ({ data: null, error: null }))
    const service = new ArtifactAgentDelegationService()
    const handlers = service.getHandlers(
      makeTarget({ userClient: user.client, serviceClient: serviceClient.client }),
    )

    const result = await handlers.ask_agent(
      { target_agent_key: 'writer', prompt: 'Review this' },
      'agent:caller',
    )

    expect(result).toMatchObject({ success: false, error: 'Agent gateway not configured' })
    expect(serviceClient.records[0]).toMatchObject({
      table: 'agent_delegations',
      operation: 'insert',
      payload: expect.objectContaining({
        caller_agent_key: 'caller-agent',
        target_agent_key: 'writer',
        type: 'query',
        prompt: 'Review this',
        status: 'running',
      }),
    })
    expect(serviceClient.records[1]).toMatchObject({
      table: 'agent_delegations',
      operation: 'update',
      payload: expect.objectContaining({
        status: 'failed',
        response_metadata: { error: 'Agent gateway not configured' },
      }),
    })
  })

  it('assigns a hired agent to the requested campaign when hire succeeds', async () => {
    const hireClient = {
      hireReady: vi.fn(async () => ({ agent_key: 'new-agent', name: 'New Agent' })),
    }
    const user = makeQueryClient((record) => {
      if (record.table === 'agents_registry') {
        return {
          data: { agent_key: 'new-agent', name: 'New Agent', role: 'Strategist', image_url: null },
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const service = new ArtifactAgentDelegationService({ hireClient })
    const handlers = service.getHandlers(
      makeTarget({
        userClient: user.client,
        configValues: {
          MAIN_API_URL: 'https://main-api.example.test',
          INTERNAL_API_TOKEN: 'internal-token',
        },
      }),
    )

    const result = await handlers.approve_agent_hire(
      { role_key: 'strategist', campaign_id: 'campaign-1', agent_name: 'New Agent' },
      'agent:caller',
    )

    expect(hireClient.hireReady).toHaveBeenCalledWith({
      mainApiUrl: 'https://main-api.example.test',
      internalToken: 'internal-token',
      userId: 'user-1',
      orgId: null,
      roleKey: 'strategist',
      name: 'New Agent',
    })
    expect(result).toEqual({
      success: true,
      hired_agent_key: 'new-agent',
      hired_agent_name: 'New Agent',
      campaign_id: 'campaign-1',
      assigned_to_campaign: true,
    })
    expect(user.records.find((record) => record.table === 'campaign_agents')).toMatchObject({
      operation: 'upsert',
      payload: {
        campaign_id: 'campaign-1',
        user_id: 'user-1',
        org_id: null,
        agent_key: 'new-agent',
        name: 'New Agent',
        status: 'idle',
      },
      upsertOptions: { onConflict: 'campaign_id,agent_key' },
    })
  })
})
