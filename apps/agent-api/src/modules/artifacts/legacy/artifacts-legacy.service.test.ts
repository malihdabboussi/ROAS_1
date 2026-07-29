import type { ConfigService } from '@nestjs/config'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactsService } from './artifacts-legacy.service'

function makeConfigMock(): ConfigService {
  return {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
      if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
      throw new Error(`Unexpected getOrThrow key: ${key}`)
    }),
    get: vi.fn((key: string, fallback?: string) => {
      if (key === 'OPENCLAW_GATEWAY_URL') return 'http://gateway.local'
      if (key === 'OPENCLAW_GATEWAY_TOKEN') return 'gateway-token'
      if (key === 'OPENCLAW_GATEWAY_FETCH_TIMEOUT_MS') return fallback ?? ''
      return fallback ?? ''
    }),
  } as unknown as ConfigService
}

function makeServiceHarness(openRouterCostService?: unknown) {
  const credits = {
    assertHasAvailableCredits: vi.fn(async () => undefined),
    processDirectTextUsage: vi.fn(async () => undefined),
  }
  const providerBillingAttempts = {
    recordAttempt: vi.fn(async () => undefined),
    recordAttempts: vi.fn(async () => undefined),
  }
  const healthInsert = vi.fn(async () => ({ data: null, error: null }))
  const serviceClient = { from: vi.fn(() => ({ insert: healthInsert })) }
  const service = new ArtifactsService(
    makeConfigMock(),
    { logError: vi.fn() } as never,
    { get: vi.fn(), set: vi.fn(), getScope: vi.fn(), getActiveWorkingSet: vi.fn() } as never,
    credits as never,
    {} as never,
    { tagMemory: vi.fn() } as never,
    {} as never,
    { client: serviceClient } as never,
    {} as never,
    undefined,
    openRouterCostService as never,
    providerBillingAttempts as never,
  )
  return { service, credits, healthInsert, serviceClient, providerBillingAttempts }
}

function makeService(): ArtifactsService {
  return makeServiceHarness().service
}

function makeAwaitableQuery(result: unknown, calls: string[]) {
  const query = {
    select: vi.fn((columns: string) => {
      calls.push(`select:${columns}`)
      return query
    }),
    eq: vi.fn((column: string, value: unknown) => {
      calls.push(`eq:${column}:${String(value)}`)
      return query
    }),
    is: vi.fn((column: string, value: unknown) => {
      calls.push(`is:${column}:${String(value)}`)
      return query
    }),
    order: vi.fn((column: string, options?: unknown) => {
      calls.push(`order:${column}:${JSON.stringify(options ?? {})}`)
      return query
    }),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

describe('ArtifactsService OpenClaw response proxy compatibility', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('retries without compatibility-only payload keys when the gateway rejects them', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn(async () => '{"error":"Unrecognized key: \\"lane\\""}'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn(async () => '{"id":"response-1"}'),
      })
    vi.stubGlobal('fetch', fetchMock)
    const service = makeService()

    const result = await service.proxyOpenClawResponses(
      {
        model: 'atlas',
        input: 'train this',
        lane: 'brain:brain-1',
        enabled_toolkits: ['brain'],
        metadata: { user_id: 'user-1' },
      },
      'agent:atlas:run-brain-job-user-1',
      'atlas',
    )

    expect(result).toEqual({ id: 'response-1' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    const secondBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)
    expect(firstBody).toMatchObject({ lane: 'brain:brain-1', enabled_toolkits: ['brain'] })
    expect(secondBody).not.toHaveProperty('lane')
    expect(secondBody).not.toHaveProperty('enabled_toolkits')
    expect(secondBody).toMatchObject({
      model: 'atlas',
      input: 'train this',
      metadata: { user_id: 'user-1' },
    })
  })

  it('bills OpenClaw responses from provider cost metadata with generation ids', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn(async () =>
          JSON.stringify({
            id: 'response-1',
            model: 'anthropic/claude-opus-4.6',
            usage: {
              input_tokens: 50,
              output_tokens: 20,
              cache_read_input_tokens: 50,
              total_tokens: 120,
            },
            metadata: {
              provider_cost: 2.5,
              provider_generation_ids: ['gen-test-1'],
              provider_generations: [
                {
                  model: 'anthropic/claude-opus-4.6',
                  providerCost: 2.5,
                  usage: {
                    input: 50,
                    output: 20,
                    cacheRead: 50,
                    cacheWrite: 0,
                  },
                },
              ],
              provider_billing: 'openrouter',
              workload_channel: 'brain-ops',
              workload_action: 'Brain Pattern Analysis',
            },
          }),
        ),
      }),
    )
    const { service, credits, providerBillingAttempts } = makeServiceHarness()

    await service.proxyOpenClawResponses(
      {
        model: 'atlas',
        input: 'train this',
        metadata: { user_id: 'user-1', agent_key: 'atlas' },
      },
      'agent:atlas:run-brain-job-user-1',
      'atlas',
    )

    await vi.waitFor(() => expect(providerBillingAttempts.recordAttempts).toHaveBeenCalledTimes(1))
    expect(providerBillingAttempts.recordAttempts).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'user-1',
        feature: 'brain',
        action: 'brain_pattern_analysis',
        provider: 'openrouter',
        providerGenerationId: 'gen-test-1',
        providerCostUsd: 2.5,
      }),
    ])
    expect(credits.processDirectTextUsage).not.toHaveBeenCalled()
  })

  it('logs missing OpenRouter cost instead of billing estimated gateway tokens', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn(async () =>
          JSON.stringify({
            id: 'response-1',
            model: 'anthropic/claude-opus-4.6',
            usage: {
              input_tokens: 50,
              output_tokens: 20,
              total_tokens: 70,
            },
          }),
        ),
      }),
    )
    const { service, credits, healthInsert } = makeServiceHarness()

    await service.proxyOpenClawResponses(
      {
        model: 'atlas',
        input: 'train this',
        metadata: { user_id: 'user-1', agent_key: 'atlas' },
      },
      'agent:atlas:run-brain-job-user-1',
      'atlas',
    )

    await vi.waitFor(() => expect(healthInsert).toHaveBeenCalledTimes(1))
    expect(credits.processDirectTextUsage).not.toHaveBeenCalled()
    expect(healthInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'openrouter_provider_cost_missing',
        feature: 'brain',
        action: 'atlas',
      }),
    )
  })

  it('does not fall back to direct charging when a generation-ledger write is uncertain', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn(async () =>
          JSON.stringify({
            id: 'response-1',
            model: 'anthropic/claude-sonnet-4.6',
            usage: { input_tokens: 50, output_tokens: 20, total_tokens: 70 },
            metadata: {
              provider_generation_ids: ['gen-write-uncertain'],
              provider_cost: 0.01,
            },
          }),
        ),
      }),
    )
    const { service, credits, providerBillingAttempts, healthInsert } = makeServiceHarness()
    providerBillingAttempts.recordAttempts.mockRejectedValueOnce(new Error('write timed out'))

    await service.proxyOpenClawResponses(
      {
        model: 'atlas',
        input: 'train this',
        metadata: { user_id: 'user-1', agent_key: 'atlas' },
      },
      'agent:atlas:run-brain-job-user-1',
      'atlas',
    )

    await vi.waitFor(() =>
      expect(healthInsert).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'provider_attempt_write_failed' }),
      ),
    )
    expect(credits.processDirectTextUsage).not.toHaveBeenCalled()
  })

  it('falls back from paid-model zero provider cost to OpenRouter calculated cost', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn(async () =>
          JSON.stringify({
            id: 'response-1',
            model: 'anthropic/claude-sonnet-4.6',
            usage: {
              input_tokens: 1000,
              output_tokens: 100,
              total_tokens: 1100,
            },
            metadata: {
              provider_cost: 0,
              provider_billing: 'openrouter',
              provider_generations: [
                {
                  model: 'anthropic/claude-sonnet-4.6',
                  providerCost: 0,
                  usage: {
                    input: 1000,
                    output: 100,
                    cacheRead: 0,
                    cacheWrite: 0,
                  },
                },
              ],
            },
          }),
        ),
      }),
    )
    const openRouterCostService = {
      sumGenerationCosts: vi.fn(async () => ({
        totalUsd: 0.0045,
        costSource: 'openrouter_calc',
        generationIds: [],
      })),
    }
    const { service, credits, healthInsert } = makeServiceHarness(openRouterCostService)

    await service.proxyOpenClawResponses(
      {
        model: 'atlas',
        input: 'train this',
        metadata: { user_id: 'user-1', agent_key: 'atlas' },
      },
      'agent:atlas:run-brain-job-user-1',
      'atlas',
    )

    await vi.waitFor(() => expect(credits.processDirectTextUsage).toHaveBeenCalledTimes(1))
    expect(healthInsert).not.toHaveBeenCalled()
    expect(openRouterCostService.sumGenerationCosts).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          modelId: 'anthropic/claude-sonnet-4.6',
          usage: {
            inputTokens: 1000,
            outputTokens: 100,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
        }),
      ],
      'anthropic/claude-sonnet-4.6',
    )
    const [[generationInputs]] = openRouterCostService.sumGenerationCosts.mock.calls
    expect(generationInputs[0]).not.toHaveProperty('providerCost')
    expect(credits.processDirectTextUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        costSource: 'openrouter_calc',
        preComputedCost: 0.0045,
      }),
    )
  })
})

describe('ArtifactsService agent checkpoint snapshots', () => {
  it('captures org-scoped agent definitions and skills before mutation', async () => {
    const definitionCalls: string[] = []
    const skillCalls: string[] = []
    const definitionsQuery = makeAwaitableQuery(
      {
        data: [
          { file_name: 'agent.md', content: 'Operate clearly.' },
          { file_name: 'voice.md', content: null },
        ],
        error: null,
      },
      definitionCalls,
    )
    const skillsQuery = makeAwaitableQuery(
      {
        data: [
          {
            skill_key: 'research',
            name: 'Research',
            description: null,
            markdown_content: '# Research',
            is_enabled: true,
          },
          {
            skill_key: 'draft',
            name: null,
            description: 'Draft copy',
            markdown_content: null,
            is_enabled: false,
          },
        ],
        error: null,
      },
      skillCalls,
    )
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'agent_definitions') return definitionsQuery
        if (table === 'agent_skills') return skillsQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
    const service = new ArtifactsService(
      makeConfigMock(),
      { logError: vi.fn() } as never,
      { get: vi.fn(), set: vi.fn(), getScope: vi.fn(), getActiveWorkingSet: vi.fn() } as never,
      {
        assertHasAvailableCredits: vi.fn(async () => undefined),
        processDirectTextUsage: vi.fn(async () => undefined),
      } as never,
      {} as never,
      { tagMemory: vi.fn() } as never,
      {} as never,
      { client: serviceClient } as never,
      {} as never,
      undefined,
    )

    const snapshot = await (service as any).captureAgentCheckpointSnapshot(
      'user-1',
      'org-1',
      'copywriter',
    )

    expect(snapshot).toEqual({
      definitions: [
        { file_name: 'agent.md', content: 'Operate clearly.' },
        { file_name: 'voice.md', content: '' },
      ],
      skills: [
        {
          skill_key: 'research',
          name: 'Research',
          description: '',
          markdown_content: '# Research',
          is_enabled: true,
        },
        {
          skill_key: 'draft',
          name: '',
          description: 'Draft copy',
          markdown_content: '',
          is_enabled: false,
        },
      ],
    })
    expect(serviceClient.from).toHaveBeenCalledWith('agent_definitions')
    expect(serviceClient.from).toHaveBeenCalledWith('agent_skills')
    expect(definitionCalls).toEqual([
      'select:file_name, content',
      'eq:agent_key:copywriter',
      'order:file_name:{"ascending":true}',
      'eq:org_id:org-1',
      'is:user_id:null',
    ])
    expect(skillCalls).toEqual([
      'select:skill_key, name, description, markdown_content, is_enabled',
      'eq:agent_key:copywriter',
      'order:skill_key:{"ascending":true}',
      'eq:org_id:org-1',
      'is:user_id:null',
    ])
  })
})
