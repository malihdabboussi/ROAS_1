import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatPrewarmCacheService } from './chat-prewarm-cache.service'
import { ChatService } from './chat.service'

function makeQuery(result: unknown) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    insert: vi.fn(async () => ({ data: result, error: null })),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: result, error: null })),
    then: (resolve: (value: { data: unknown; error: null; count?: number }) => unknown) =>
      Promise.resolve(resolve({ data: result, error: null, count: 0 })),
  }
  return query
}

function makeChatRunEventsMock() {
  return {
    getActiveRunForConversation: vi.fn(async () => null),
    startRun: vi.fn(async () => undefined),
    appendEvent: vi.fn(async () => null),
    markRunDone: vi.fn(async () => undefined),
    markRunFailed: vi.fn(async () => undefined),
    recordRunRouting: vi.fn(async () => undefined),
  }
}

const AUTO_MODEL_CAPABILITY_ROW = {
  capability_profile: {
    reasoning: { transport: 'verbosity', levels: ['low', 'medium', 'high', 'xhigh', 'max'] },
    context: { tiers: [{ tokens: 300_000, label: '300K' }] },
    speed: { available: false },
  },
}

function normalizeLivePayloadForStored(
  livePayload: Record<string, unknown>,
  storedPayload: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = { ...livePayload }
  delete normalized.cursor
  if (!Object.prototype.hasOwnProperty.call(storedPayload, 'run_id')) {
    delete normalized.run_id
  }
  return normalized
}

describe('ChatService access context', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('injects access policy into chat context before OpenClaw', async () => {
    const turnOrder: string[] = []
    const streamCompletion = vi.fn(async () => ({
      content: 'Answer',
      toolSteps: [],
      completedGenerations: [],
      failed: undefined,
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agents_registry') return makeQuery({ config: {}, is_active: true })
        if (table === 'llm_model_capabilities') return makeQuery(AUTO_MODEL_CAPABILITY_ROW)
        return makeQuery(null)
      }),
    }
    const messages = {
      create: vi.fn(async (_s, record: { role: string }) => {
        if (record.role === 'assistant') turnOrder.push('assistant-create')
      }),
      update: vi.fn(),
      findAllByConversationId: vi.fn(async () => []),
    }
    const messageTimeline = {
      appendEvent: vi.fn(async (input: { type: string }) => {
        if (input.type === 'message_start') turnOrder.push('timeline-message-start')
      }),
    }
    const send = vi.fn(async (type: string) => {
      if (type === 'message_start') turnOrder.push('send-message-start')
    })
    const service = new ChatService(
      messages as any,
      {
        findByIdScoped: vi.fn(async () => ({
          id: 'conversation-1',
          campaign_id: null,
          agent_id: 'zara',
          metadata: {},
        })),
        findByIdOrgScoped: vi.fn(),
        update: vi.fn(),
      } as any,
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:conversation:conversation-1'),
      } as any,
      {
        processUsage: vi.fn(async () => null),
        processDirectTextUsage: vi.fn(async () => null),
      } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({
          hasAgentBrain: true,
          brainId: 'brain-zara',
        })),
        buildFullContext: vi.fn(async () => 'AGENT BRAIN — Specific Knowledge:'),
      } as any,
      {
        startTrace: vi.fn(async () => 'trace-1'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      messageTimeline as any,
      {
        sumGenerationCosts: vi.fn(async () => ({ totalUsd: undefined, totalUsdSource: undefined })),
      } as any,
      {
        register: vi.fn(),
        registerSend: vi.fn(),
        complete: vi.fn(),
        clearAbortController: vi.fn(),
      } as any,
      makeChatRunEventsMock() as any,
      {
        set: vi.fn(),
        clear: vi.fn(),
        drainAgentCheckpointMutations: vi.fn(() => []),
        getActiveWorkingSet: vi.fn(() => ({ byType: {}, lastTouched: null })),
        replaceActiveWorkingSet: vi.fn(),
        setActiveArtifact: vi.fn(),
      } as any,
      { getForChannel: vi.fn(() => '') } as any,
      { buildThemeSummary: vi.fn() } as any,
      { createUserClient: vi.fn(() => supabase) } as any,
      { client: supabase } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        resolveRuntimeSkillScope: vi.fn(async () => ({
          skills: [],
          resources: [],
          requiredSkillFiles: [],
        })),
      } as any,
      { parse: vi.fn() } as any,
      { buildIntegrationContext: vi.fn() } as any,
      { resolveEffectiveLevel: vi.fn() } as any,
      { finalizeTurn: vi.fn() } as any,
      { recordCompletion: vi.fn(async () => undefined) } as any,
      {
        resolveAgentPolicy: vi.fn(async () => ({
          effective: new Set(),
          grants: [],
          overrides: { allow_extra: [], deny: [] },
        })),
        canAgentUseCapability: vi.fn(async () => false),
      } as any,
    )

    await service.processMessage({
      supabase: supabase as any,
      conversationId: 'conversation-1',
      content: 'Help',
      userId: 'user-1',
      accessToken: 'token',
      send,
    })

    const call = (streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ content: string }>
      disabledNativeActions: string[]
    }
    const contextMessage = call.input.find((item) => String(item.content).startsWith('[CONTEXT]'))
    expect(contextMessage?.content).toContain('ACCESS POLICY for zara:')
    expect(contextMessage?.content).toContain('search_user_brain')
    expect(contextMessage?.content).toContain('AGENT BRAIN')
    expect(call.disabledNativeActions).toContain('get_campaign')
    expect(turnOrder.indexOf('assistant-create')).toBeLessThan(
      turnOrder.indexOf('send-message-start'),
    )
    expect(turnOrder.indexOf('send-message-start')).toBeLessThan(
      turnOrder.indexOf('timeline-message-start'),
    )
    expect(supabase.from).not.toHaveBeenCalledWith('browser_sessions')
  })

  it('sends uploaded images as URL input_image parts', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: 'Answer',
      toolSteps: [],
      completedGenerations: [],
      failed: undefined,
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agents_registry') return makeQuery({ config: {}, is_active: true })
        if (table === 'llm_model_capabilities') return makeQuery(AUTO_MODEL_CAPABILITY_ROW)
        return makeQuery(null)
      }),
    }
    const service = new ChatService(
      { create: vi.fn(), update: vi.fn(), findAllByConversationId: vi.fn(async () => []) } as any,
      {
        findByIdScoped: vi.fn(async () => ({
          id: 'conversation-1',
          campaign_id: null,
          agent_id: 'zara',
          metadata: {},
        })),
        findByIdOrgScoped: vi.fn(),
        update: vi.fn(),
      } as any,
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:conversation:conversation-1'),
      } as any,
      {
        processUsage: vi.fn(async () => null),
        processDirectTextUsage: vi.fn(async () => null),
      } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({
          hasAgentBrain: true,
          brainId: 'brain-zara',
        })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
      {
        startTrace: vi.fn(async () => 'trace-1'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      { appendEvent: vi.fn(async () => undefined) } as any,
      {
        sumGenerationCosts: vi.fn(async () => ({ totalUsd: undefined, totalUsdSource: undefined })),
      } as any,
      {
        register: vi.fn(),
        registerSend: vi.fn(),
        complete: vi.fn(),
        clearAbortController: vi.fn(),
      } as any,
      makeChatRunEventsMock() as any,
      {
        set: vi.fn(),
        clear: vi.fn(),
        drainAgentCheckpointMutations: vi.fn(() => []),
        getActiveWorkingSet: vi.fn(() => ({ byType: {}, lastTouched: null })),
        replaceActiveWorkingSet: vi.fn(),
        setActiveArtifact: vi.fn(),
      } as any,
      { getForChannel: vi.fn(() => '') } as any,
      { buildThemeSummary: vi.fn() } as any,
      { createUserClient: vi.fn(() => supabase) } as any,
      { client: supabase } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        resolveRuntimeSkillScope: vi.fn(async () => ({
          skills: [],
          resources: [],
          requiredSkillFiles: [],
        })),
      } as any,
      { parse: vi.fn() } as any,
      { buildIntegrationContext: vi.fn() } as any,
      { resolveEffectiveLevel: vi.fn() } as any,
      { finalizeTurn: vi.fn() } as any,
      { recordCompletion: vi.fn(async () => undefined) } as any,
      {
        resolveAgentPolicy: vi.fn(async () => ({
          effective: new Set(),
          grants: [],
          overrides: { allow_extra: [], deny: [] },
        })),
        canAgentUseCapability: vi.fn(async () => false),
      } as any,
    )

    await service.processMessage({
      supabase: supabase as any,
      conversationId: 'conversation-1',
      content: 'Can you see this?',
      userId: 'user-1',
      accessToken: 'token',
      documents: [
        {
          filename: 'brand.png',
          type: 'image',
          fileUrl: 'https://storage.example.com/brand.png',
          mimeType: 'image/png',
        },
      ],
      send: vi.fn(async () => undefined),
    })

    const call = (streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ content: Array<Record<string, unknown>> | string }>
    }
    const userMessage = call.input.find((item) => Array.isArray(item.content))
    const imagePart = (userMessage?.content as Array<Record<string, unknown>> | undefined)?.find(
      (part) => part.type === 'input_image',
    ) as
      | { source?: { type?: string; media_type?: string; data?: string; url?: string } }
      | undefined

    expect(imagePart?.source?.type).toBe('url')
    expect(imagePart?.source?.url).toBe('https://storage.example.com/brand.png')
    expect(imagePart?.source?.media_type).toBeUndefined()
    expect(imagePart?.source?.data).toBeUndefined()
  })

  it('does not resend previous uploaded images as input_image parts', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: 'Answer',
      toolSteps: [],
      completedGenerations: [],
      failed: undefined,
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agents_registry') return makeQuery({ config: {}, is_active: true })
        if (table === 'llm_model_capabilities') return makeQuery(AUTO_MODEL_CAPABILITY_ROW)
        if (table === 'conversation_documents') {
          return makeQuery([
            {
              title: 'previous.jpg',
              content: { file_url: 'https://storage.example.com/previous.jpg' },
            },
          ])
        }
        return makeQuery(null)
      }),
    }
    const service = new ChatService(
      { create: vi.fn(), update: vi.fn(), findAllByConversationId: vi.fn(async () => []) } as any,
      {
        findByIdScoped: vi.fn(async () => ({
          id: 'conversation-1',
          campaign_id: null,
          agent_id: 'zara',
          metadata: {},
        })),
        findByIdOrgScoped: vi.fn(),
        update: vi.fn(),
      } as any,
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:conversation:conversation-1'),
      } as any,
      {
        processUsage: vi.fn(async () => null),
        processDirectTextUsage: vi.fn(async () => null),
      } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({
          hasAgentBrain: true,
          brainId: 'brain-zara',
        })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
      {
        startTrace: vi.fn(async () => 'trace-1'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      { appendEvent: vi.fn(async () => undefined) } as any,
      {
        sumGenerationCosts: vi.fn(async () => ({ totalUsd: undefined, totalUsdSource: undefined })),
      } as any,
      {
        register: vi.fn(),
        registerSend: vi.fn(),
        complete: vi.fn(),
        clearAbortController: vi.fn(),
      } as any,
      makeChatRunEventsMock() as any,
      {
        set: vi.fn(),
        clear: vi.fn(),
        drainAgentCheckpointMutations: vi.fn(() => []),
        getActiveWorkingSet: vi.fn(() => ({ byType: {}, lastTouched: null })),
        replaceActiveWorkingSet: vi.fn(),
        setActiveArtifact: vi.fn(),
      } as any,
      { getForChannel: vi.fn(() => '') } as any,
      { buildThemeSummary: vi.fn() } as any,
      { createUserClient: vi.fn(() => supabase) } as any,
      { client: supabase } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        resolveRuntimeSkillScope: vi.fn(async () => ({
          skills: [],
          resources: [],
          requiredSkillFiles: [],
        })),
      } as any,
      { parse: vi.fn() } as any,
      { buildIntegrationContext: vi.fn() } as any,
      { resolveEffectiveLevel: vi.fn() } as any,
      { finalizeTurn: vi.fn() } as any,
      { recordCompletion: vi.fn(async () => undefined) } as any,
      {
        resolveAgentPolicy: vi.fn(async () => ({
          effective: new Set(),
          grants: [],
          overrides: { allow_extra: [], deny: [] },
        })),
        canAgentUseCapability: vi.fn(async () => false),
      } as any,
    )

    await service.processMessage({
      supabase: supabase as any,
      conversationId: 'conversation-1',
      content: 'Follow up without new files',
      userId: 'user-1',
      accessToken: 'token',
      send: vi.fn(async () => undefined),
    })

    const call = (streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ content: Array<Record<string, unknown>> | string }>
    }
    const imageParts = call.input.flatMap((item) =>
      Array.isArray(item.content) ? item.content.filter((part) => part.type === 'input_image') : [],
    )

    expect(imageParts).toHaveLength(0)
  })

  it('rejects uploaded images for non-vision manual models', async () => {
    const streamCompletion = vi.fn()
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agents_registry') return makeQuery({ config: {}, is_active: true })
        return makeQuery(null)
      }),
    }
    const service = new ChatService(
      { create: vi.fn(), update: vi.fn(), findAllByConversationId: vi.fn(async () => []) } as any,
      {
        findByIdScoped: vi.fn(async () => ({
          id: 'conversation-1',
          campaign_id: null,
          agent_id: 'zara',
          metadata: {},
        })),
        findByIdOrgScoped: vi.fn(),
        update: vi.fn(),
      } as any,
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:conversation:conversation-1'),
      } as any,
      { processUsage: vi.fn(), processDirectTextUsage: vi.fn() } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({
          hasAgentBrain: true,
          brainId: 'brain-zara',
        })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
      { startTrace: vi.fn(), completeTrace: vi.fn(), failTrace: vi.fn() } as any,
      { appendEvent: vi.fn() } as any,
      { sumGenerationCosts: vi.fn() } as any,
      {
        register: vi.fn(),
        registerSend: vi.fn(),
        complete: vi.fn(),
        clearAbortController: vi.fn(),
      } as any,
      makeChatRunEventsMock() as any,
      {
        set: vi.fn(),
        clear: vi.fn(),
        drainAgentCheckpointMutations: vi.fn(() => []),
        getActiveWorkingSet: vi.fn(() => ({ byType: {}, lastTouched: null })),
        replaceActiveWorkingSet: vi.fn(),
        setActiveArtifact: vi.fn(),
      } as any,
      { getForChannel: vi.fn(() => '') } as any,
      { buildThemeSummary: vi.fn() } as any,
      { createUserClient: vi.fn(() => supabase) } as any,
      { client: supabase } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        resolveRuntimeSkillScope: vi.fn(async () => ({
          skills: [],
          resources: [],
          requiredSkillFiles: [],
        })),
      } as any,
      { parse: vi.fn() } as any,
      { buildIntegrationContext: vi.fn() } as any,
      { resolveEffectiveLevel: vi.fn() } as any,
      { finalizeTurn: vi.fn() } as any,
      { recordCompletion: vi.fn(async () => undefined) } as any,
      {
        resolveAgentPolicy: vi.fn(async () => ({
          effective: new Set(),
          grants: [],
          overrides: { allow_extra: [], deny: [] },
        })),
        canAgentUseCapability: vi.fn(async () => false),
      } as any,
    )

    await expect(
      service.processMessage({
        supabase: supabase as any,
        conversationId: 'conversation-1',
        content: 'Can you see this?',
        model: 'minimax/minimax-m2.5',
        userId: 'user-1',
        accessToken: 'token',
        documents: [
          {
            filename: 'brand.png',
            type: 'image',
            fileUrl: 'https://storage.example.com/brand.png',
            mimeType: 'image/png',
          },
        ],
        send: vi.fn(async () => undefined),
      }),
    ).rejects.toThrow('This model does not support images')
    expect(streamCompletion).not.toHaveBeenCalled()
  })
})

function makeChainQuery(result: unknown) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    in: vi.fn(() => query),
    or: vi.fn(() => query),
    neq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    insert: vi.fn(async () => ({ data: result, error: null })),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: result, error: null })),
    single: vi.fn(async () => ({ data: result, error: null })),
    then: (resolve: (value: { data: unknown; error: null; count?: number }) => unknown) =>
      Promise.resolve(resolve({ data: result, error: null, count: 0 })),
  }
  return query
}

const DEFAULT_MODEL_CAPABILITY_ROW = {
  capability_profile: {
    reasoning: { transport: 'reasoning.effort', levels: ['none', 'low'] },
    context: { tiers: [{ tokens: 65_536, label: '65k' }] },
    speed: { available: true, fastModelId: 'google/gemini-3.5-flash' },
  },
}

const MODEL_CAPABILITY_ROWS = new Map<string, unknown>(
  [
    'anthropic/claude-opus-4.6',
    'anthropic/claude-opus-4.7',
    'anthropic/claude-opus-4.8',
    'anthropic/claude-sonnet-4.6',
    'anthropic/claude-haiku-4.5',
    'google/gemini-3.5-flash',
    'openai/gpt-5.3-codex',
    'openai/gpt-5.5',
  ].map((modelId) => [modelId, DEFAULT_MODEL_CAPABILITY_ROW]),
)

function makeModelCapabilityQuery(lookups: Array<{ provider: string; modelName: string }>) {
  let provider: string | null = null
  let modelName: string | null = null
  const query = makeChainQuery(null)
  query.eq = vi.fn((column: string, value: unknown) => {
    if (column === 'provider' && typeof value === 'string') provider = value
    if (column === 'model_name' && typeof value === 'string') modelName = value
    return query
  })
  query.maybeSingle = vi.fn(async () => {
    if (!provider || !modelName) return { data: null, error: null }
    lookups.push({ provider, modelName })
    return {
      data: MODEL_CAPABILITY_ROWS.get(`${provider}/${modelName}`) ?? null,
      error: null,
    }
  })
  return query
}

function makePrewarmHarness() {
  const agentsRegistryRow = {
    config: { model_id: 'google/gemini-3.5-flash', capability_domain: 'marketing' },
    is_active: true,
  }
  const modelCapabilityLookups: Array<{ provider: string; modelName: string }> = []
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'agents_registry') return makeChainQuery(agentsRegistryRow)
      if (table === 'space_items') {
        return makeChainQuery([
          {
            id: 'artifact-1',
            space_id: 'space-1',
            custom_data: { post_url: 'https://example.com/post', analyzed_at: '2026-06-01' },
          },
        ])
      }
      if (table === 'media_assets') {
        return makeChainQuery([
          {
            id: 'media-1',
            name: 'Hero',
            public_url: 'https://cdn.example.com/hero.png',
            mime_type: 'image/png',
          },
        ])
      }
      if (table === 'agent_workflows') return makeChainQuery([])
      if (table === 'llm_model_capabilities') {
        return makeModelCapabilityQuery(modelCapabilityLookups)
      }
      return makeChainQuery(null)
    }),
  }
  const messages = {
    create: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
    findAllByConversationId: vi.fn(async () => []),
    findById: vi.fn(async () => null),
  }
  const conversations = {
    findByIdScoped: vi.fn(async () => ({
      id: 'conversation-1',
      campaign_id: 'campaign-1',
      agent_id: 'zara',
      metadata: {},
    })),
    findByIdOrgScoped: vi.fn(async () => ({
      id: 'conversation-1',
      campaign_id: 'campaign-1',
      agent_id: 'zara',
      metadata: {},
    })),
    update: vi.fn(async () => undefined),
  }
  const openClaw = {
    streamCompletion: vi.fn(async () => ({
      content: 'Answer',
      toolSteps: [],
      completedGenerations: [],
      failed: undefined,
    })),
  }
  const agentRuntime = {
    resolveConversationRuntime: vi.fn(async () => ({
      gatewayAgentId: 'employee',
      agentKey: 'zara',
    })),
    buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:conversation:conversation-1'),
  }
  const brainContext = {
    resolveAgentBrainPresence: vi.fn(async () => ({
      hasAgentBrain: true,
      brainId: 'brain-zara',
    })),
    buildFullContext: vi.fn(async () => 'MESSAGE BRAIN CONTEXT'),
  }
  const runtimeReadiness = { ensureRuntimeReady: vi.fn(async () => undefined) }
  const runtimeSkillScope = {
    resolveRuntimeSkillScope: vi.fn(async () => ({
      skills: [
        {
          skill_key: 'launch',
          name: 'Launch',
          markdown_content: 'Launch skill instructions',
        },
      ],
      resources: [],
      requiredSkillFiles: [],
    })),
  }
  const campaignContext = {
    buildThemeSummary: vi.fn(async () => 'THEME CONTEXT'),
  }
  const integrationContext = {
    buildIntegrationContext: vi.fn(async () => 'INTEGRATION CONTEXT'),
  }
  const agentPolicy = {
    resolveAgentPolicy: vi.fn(async () => ({
      effective: new Set(['campaign_context:*', 'brain_access:personal']),
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      teamId: null,
    })),
    canAgentUseCapability: vi.fn(async (_agentKey: string, kind: string, id: string) => {
      if (kind === 'brain_access' && id === 'personal') return true
      if (kind === 'campaign_context') return true
      if (kind === 'channel') return true
      return false
    }),
    canExecuteAction: vi.fn(async () => ({ allowed: true })),
  }
  const prewarmCache = new ChatPrewarmCacheService()
  const chatRunEvents = makeChatRunEventsMock()
  const service = new ChatService(
    messages as any,
    conversations as any,
    openClaw as any,
    agentRuntime as any,
    {
      processUsage: vi.fn(async () => null),
      processDirectTextUsage: vi.fn(async () => null),
    } as any,
    brainContext as any,
    {
      startTrace: vi.fn(async () => 'trace-1'),
      completeTrace: vi.fn(async () => undefined),
      failTrace: vi.fn(async () => undefined),
    } as any,
    { appendEvent: vi.fn(async () => undefined) } as any,
    {
      sumGenerationCosts: vi.fn(async () => ({ totalUsd: undefined, totalUsdSource: undefined })),
    } as any,
    {
      register: vi.fn(),
      registerSend: vi.fn(),
      complete: vi.fn(),
      clearAbortController: vi.fn(),
    } as any,
    chatRunEvents as any,
    {
      set: vi.fn(),
      clear: vi.fn(),
      drainAgentCheckpointMutations: vi.fn(() => []),
      getActiveWorkingSet: vi.fn(() => ({ byType: {}, lastTouched: null })),
      replaceActiveWorkingSet: vi.fn(),
      setActiveArtifact: vi.fn(),
    } as any,
    { getForChannel: vi.fn(() => '') } as any,
    campaignContext as any,
    { createUserClient: vi.fn(() => supabase) } as any,
    { client: supabase } as any,
    runtimeReadiness as any,
    runtimeSkillScope as any,
    { parse: vi.fn() } as any,
    integrationContext as any,
    { resolveEffectiveLevel: vi.fn() } as any,
    { finalizeTurn: vi.fn() } as any,
    { recordCompletion: vi.fn(async () => undefined) } as any,
    agentPolicy as any,
    prewarmCache,
  )

  return {
    service,
    supabase,
    messages,
    conversations,
    openClaw,
    agentRuntime,
    brainContext,
    runtimeReadiness,
    runtimeSkillScope,
    campaignContext,
    integrationContext,
    chatRunEvents,
    prewarmCache,
    modelCapabilityLookups,
  }
}

describe('ChatService prewarm context', () => {
  it('prewarms agent context without a conversation id', async () => {
    const harness = makePrewarmHarness()

    const result = await harness.service.prewarmAgentChatContext({
      supabase: harness.supabase as any,
      agentKey: 'zara',
      userId: 'user-1',
      accessToken: 'token',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      source: 'public_agent',
    })

    expect(result.ok).toBe(true)
    expect(harness.messages.create).not.toHaveBeenCalled()
    expect(harness.openClaw.streamCompletion).not.toHaveBeenCalled()
    expect(harness.agentRuntime.resolveConversationRuntime).toHaveBeenCalledWith(
      harness.supabase,
      'user-1',
      'zara',
      'org-1',
    )
    expect(harness.runtimeReadiness.ensureRuntimeReady).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        orgId: 'org-1',
        agentKey: 'zara',
        gatewayAgentId: 'employee',
      }),
    )
    expect(harness.integrationContext.buildIntegrationContext).toHaveBeenCalled()
    expect(harness.brainContext.resolveAgentBrainPresence).toHaveBeenCalled()
    expect(harness.campaignContext.buildThemeSummary).not.toHaveBeenCalled()
  })

  it('reuses page-load agent prewarm when building conversation context', async () => {
    const harness = makePrewarmHarness()

    await harness.service.prewarmAgentChatContext({
      supabase: harness.supabase as any,
      agentKey: 'zara',
      userId: 'user-1',
      accessToken: 'token',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      source: 'public_agent',
    })

    harness.runtimeReadiness.ensureRuntimeReady.mockClear()
    harness.agentRuntime.resolveConversationRuntime.mockClear()
    harness.integrationContext.buildIntegrationContext.mockClear()
    harness.brainContext.resolveAgentBrainPresence.mockClear()

    const result = await harness.service.prewarmChatContext({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      agentKey: 'zara',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      source: 'public_agent',
    })

    expect(result.ok).toBe(true)
    expect(result.cache_status).toBe('built_on_send')
    expect(result.agent_cache_status).toBe('hit_completed')
    expect(result.agent_reused).toBe(true)
    expect(harness.agentRuntime.resolveConversationRuntime).not.toHaveBeenCalled()
    expect(harness.runtimeReadiness.ensureRuntimeReady).not.toHaveBeenCalled()
    expect(harness.integrationContext.buildIntegrationContext).not.toHaveBeenCalled()
    expect(harness.brainContext.resolveAgentBrainPresence).not.toHaveBeenCalled()
    expect(harness.campaignContext.buildThemeSummary).toHaveBeenCalled()
  })

  it('prewarms stable context without creating messages or opening OpenClaw', async () => {
    const harness = makePrewarmHarness()

    const result = await harness.service.prewarmChatContext({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      source: 'studio',
    })

    expect(result.ok).toBe(true)
    expect(harness.messages.create).not.toHaveBeenCalled()
    expect(harness.openClaw.streamCompletion).not.toHaveBeenCalled()
    expect(harness.runtimeReadiness.ensureRuntimeReady).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        orgId: 'org-1',
        agentKey: 'zara',
        gatewayAgentId: 'employee',
      }),
    )
    expect(harness.agentRuntime.resolveConversationRuntime).toHaveBeenCalled()
    expect(harness.campaignContext.buildThemeSummary).toHaveBeenCalled()
    expect(harness.integrationContext.buildIntegrationContext).toHaveBeenCalled()
    expect(harness.brainContext.resolveAgentBrainPresence).toHaveBeenCalled()
    expect(harness.brainContext.buildFullContext).not.toHaveBeenCalled()
  })

  it('reuses fresh stable prewarm data while still running message-specific context work', async () => {
    const harness = makePrewarmHarness()

    await harness.service.prewarmChatContext({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      source: 'studio',
    })

    harness.runtimeReadiness.ensureRuntimeReady.mockClear()
    harness.agentRuntime.resolveConversationRuntime.mockClear()
    harness.campaignContext.buildThemeSummary.mockClear()
    harness.integrationContext.buildIntegrationContext.mockClear()
    harness.brainContext.resolveAgentBrainPresence.mockClear()
    harness.brainContext.buildFullContext.mockClear()

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: '/launch improve this',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      spaceId: 'space-1',
      scopeKind: 'campaign',
      highlightedArtifacts: [{ id: 'artifact-1', type: 'space_doc', label: 'Launch doc' }],
      messageReferences: [{ kind: 'media', id: 'media-1', label: 'Hero image' }],
      documents: [{ filename: 'brief.txt', type: 'text', text: 'DOC CONTEXT' }],
      send: vi.fn(async () => undefined),
    })

    expect(harness.agentRuntime.resolveConversationRuntime).not.toHaveBeenCalled()
    expect(harness.runtimeReadiness.ensureRuntimeReady).not.toHaveBeenCalled()
    expect(harness.campaignContext.buildThemeSummary).not.toHaveBeenCalled()
    expect(harness.integrationContext.buildIntegrationContext).not.toHaveBeenCalled()
    expect(harness.brainContext.resolveAgentBrainPresence).not.toHaveBeenCalled()

    expect(harness.brainContext.buildFullContext).toHaveBeenCalledWith(
      'user-1',
      'zara',
      '/launch improve this',
      'org-1',
      false,
      true,
      false,
    )
    expect(harness.runtimeSkillScope.resolveRuntimeSkillScope).toHaveBeenCalledWith(
      expect.objectContaining({ skillKeys: ['launch'] }),
    )
    const streamCall = (harness.openClaw.streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ content: string | Array<Record<string, unknown>> }>
    }
    expect(JSON.stringify(streamCall.input)).toContain('DOC CONTEXT')
    expect(JSON.stringify(streamCall.input)).toContain('USER-TAGGED ARTIFACTS')
    expect(JSON.stringify(streamCall.input)).toContain('USER @ REFERENCES')
    expect(JSON.stringify(streamCall.input)).toContain('Launch skill instructions')
    expect(JSON.stringify(streamCall.input)).toContain('MESSAGE BRAIN CONTEXT')
  })

  it('joins an in-flight stable prewarm when a send starts before prewarm finishes', async () => {
    const harness = makePrewarmHarness()
    let resolveReadinessStarted: () => void = () => {}
    let resolveReadiness: () => void = () => {}
    const readinessStarted = new Promise<void>((resolve) => {
      resolveReadinessStarted = resolve
    })
    const readinessPending = new Promise<void>((resolve) => {
      resolveReadiness = resolve
    })
    harness.runtimeReadiness.ensureRuntimeReady.mockImplementationOnce(async () => {
      resolveReadinessStarted()
      await readinessPending
    })

    const prewarmPromise = harness.service.prewarmChatContext({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      source: 'studio',
    })
    await readinessStarted

    const sendPromise = harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Send while prewarm is still running',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      send: vi.fn(async () => undefined),
    })

    await Promise.resolve()
    expect(harness.runtimeReadiness.ensureRuntimeReady).toHaveBeenCalledTimes(1)
    resolveReadiness()
    await prewarmPromise
    await sendPromise

    expect(harness.runtimeReadiness.ensureRuntimeReady).toHaveBeenCalledTimes(1)
    const finalMessageUpdate = harness.messages.update.mock.calls.at(-1)?.[2] as
      | { metadata?: Record<string, unknown> }
      | undefined
    const prewarmSpan = (
      (finalMessageUpdate?.metadata?.timing_spans as
        | Array<{ name: string; metadata?: Record<string, unknown> }>
        | undefined) ?? []
    ).find((span) => span.name === 'prewarm_context')
    expect(prewarmSpan?.metadata).toMatchObject({
      cache_hit: true,
      cache_status: 'joined_in_flight',
      cache_reused: true,
    })
  })

  it('skips full Brain retrieval for low-context public agent prompts', async () => {
    const harness = makePrewarmHarness()

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'How do you work?',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      source: 'public_agent',
      channelUser: {
        platform_id: 'visitor-1',
        display_name: 'Visitor visitor',
      },
      send: vi.fn(async () => undefined),
    })

    expect(harness.brainContext.buildFullContext).not.toHaveBeenCalled()
    const streamCall = (harness.openClaw.streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ content: string | Array<Record<string, unknown>> }>
    }
    const serializedInput = JSON.stringify(streamCall.input)
    expect(serializedInput).toContain('PUBLIC AGENT FAST CONTEXT')
    expect(serializedInput).toContain('Capability domain: marketing')
    const finalMessageUpdate = harness.messages.update.mock.calls.at(-1)?.[2] as
      | { metadata?: Record<string, unknown> }
      | undefined
    const spanNames = (
      (finalMessageUpdate?.metadata?.timing_spans as Array<{ name: string }> | undefined) ?? []
    ).map((span) => span.name)
    expect(spanNames).toEqual(
      expect.arrayContaining(['stable_context', 'brain_context', 'gateway_input', 'model_stream']),
    )
  })

  it('honors the live request model even when stable prewarm data is reused', async () => {
    const harness = makePrewarmHarness()
    const requestModel = 'openai-codex/gpt-5.5'
    const requestModelSettings = { reasoning_effort: 'none' as const }
    const cacheKey = (harness.service as any).createPrewarmCacheKey({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: requestModel,
      modelSettings: requestModelSettings,
      source: 'studio',
    })
    const staleStableContext = await (harness.service as any).buildStablePrewarmContext({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'anthropic/claude-sonnet-4.6',
      modelSettings: requestModelSettings,
      source: 'studio',
    })
    harness.prewarmCache.set(cacheKey, staleStableContext)

    harness.agentRuntime.resolveConversationRuntime.mockClear()
    harness.runtimeReadiness.ensureRuntimeReady.mockClear()

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Use my selected subscription model',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: requestModel,
      modelSettings: requestModelSettings,
      send: vi.fn(async () => undefined),
    })

    expect(harness.agentRuntime.resolveConversationRuntime).not.toHaveBeenCalled()
    expect(harness.runtimeReadiness.ensureRuntimeReady).not.toHaveBeenCalled()
    const streamCall = (harness.openClaw.streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      model: string
    }
    expect(streamCall.model).toBe(requestModel)
    expect(harness.modelCapabilityLookups).toContainEqual({
      provider: 'openai',
      modelName: 'gpt-5.5',
    })
    expect(harness.modelCapabilityLookups).not.toContainEqual({
      provider: 'openai-codex',
      modelName: 'gpt-5.5',
    })
  })

  it('validates Claude subscription settings against the base Claude capability profile', async () => {
    const harness = makePrewarmHarness()
    const requestModel = 'anthropic-subscription/claude-opus-4-6'

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Use Claude subscription',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: requestModel,
      modelSettings: { reasoning_effort: 'none' },
      send: vi.fn(async () => undefined),
    })

    const streamCall = (harness.openClaw.streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      model: string
    }
    expect(streamCall.model).toBe(requestModel)
    expect(harness.modelCapabilityLookups).toContainEqual({
      provider: 'anthropic',
      modelName: 'claude-opus-4.6',
    })
    expect(harness.modelCapabilityLookups).not.toContainEqual({
      provider: 'anthropic-subscription',
      modelName: 'claude-opus-4-6',
    })
  })

  it('clears session history confidence when gateway trace omits messages', async () => {
    const harness = makePrewarmHarness()
    ;(harness.service as any).sessionHistoryConfidence.set(
      'agent:zara:user-1:conversation:conversation-1',
      {
        dbMessageCount: 3,
        verifiedAt: Date.now(),
      },
    )
    ;(harness.messages.findAllByConversationId as any).mockResolvedValueOnce([
      { role: 'user', content: 'Previous question' },
      { role: 'assistant', content: 'Previous answer' },
      { role: 'user', content: 'Current question' },
    ])

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Current question',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      send: vi.fn(async () => undefined),
    })

    expect(
      (harness.service as any).sessionHistoryConfidence.get(
        'agent:zara:user-1:conversation:conversation-1',
      ),
    ).toBeUndefined()
  })

  it('refreshes session history confidence when gateway trace includes messages', async () => {
    const harness = makePrewarmHarness()
    harness.openClaw.streamCompletion.mockResolvedValueOnce({
      content: 'Answer',
      toolSteps: [],
      completedGenerations: [],
      failed: undefined,
      llmInput: {
        messages: [{ role: 'user', content: 'Current question' }],
      },
    })
    ;(harness.messages.findAllByConversationId as any).mockResolvedValueOnce([
      { role: 'user', content: 'Previous question' },
      { role: 'assistant', content: 'Previous answer' },
      { role: 'user', content: 'Current question' },
    ])

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Current question',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      send: vi.fn(async () => undefined),
    })

    expect(
      (harness.service as any).sessionHistoryConfidence.get(
        'agent:zara:user-1:conversation:conversation-1',
      ),
    ).toEqual({
      dbMessageCount: 4,
      verifiedAt: expect.any(Number),
    })
  })

  it('reconstructs DB history when session history confidence is stale', async () => {
    const harness = makePrewarmHarness()
    ;(harness.service as any).sessionHistoryConfidence.set(
      'agent:zara:user-1:conversation:conversation-1',
      {
        dbMessageCount: 99,
        verifiedAt: 0,
      },
    )
    ;(harness.messages.findAllByConversationId as any).mockResolvedValueOnce([
      { role: 'user', content: 'Previous question' },
      { role: 'assistant', content: 'Previous answer' },
      { role: 'user', content: 'Current question' },
    ])

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Current question',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      send: vi.fn(async () => undefined),
    })

    const streamCall = (harness.openClaw.streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ content: unknown }>
    }
    const serializedInput = JSON.stringify(streamCall.input)
    expect(serializedInput).toContain('[CONVERSATION_HISTORY]')
    expect(serializedInput).toContain('Previous question')
    expect(serializedInput).toContain('Previous answer')
  })

  it('does not reconstruct DB history for the first user turn', async () => {
    const harness = makePrewarmHarness()
    ;(harness.messages.findAllByConversationId as any).mockResolvedValueOnce([
      { role: 'user', content: 'First question' },
    ])

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'First question',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      send: vi.fn(async () => undefined),
    })

    const streamCall = (harness.openClaw.streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ content: unknown }>
    }
    expect(JSON.stringify(streamCall.input)).not.toContain('[CONVERSATION_HISTORY]')
  })

  it('mirrors pre-run setup events to the Redis run stream before message_start', async () => {
    const harness = makePrewarmHarness()
    const liveEvents: Array<{ type: string; payload: Record<string, unknown> }> = []

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Current question',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      send: vi.fn(async (type: string, payload: Record<string, unknown>) => {
        liveEvents.push({ type, payload })
      }),
    })

    const liveMessageStartIndex = liveEvents.findIndex((event) => event.type === 'message_start')
    expect(liveMessageStartIndex).toBeGreaterThan(0)

    const storedEvents = harness.chatRunEvents.appendEvent.mock.calls.map(([input]) => ({
      type: input.type,
      payload: input.payload,
    }))
    const storedMessageStartIndex = storedEvents.findIndex(
      (event) => event.type === 'message_start',
    )
    expect(storedMessageStartIndex).toBe(liveMessageStartIndex)
    expect(storedEvents.slice(0, storedMessageStartIndex)).toEqual(
      liveEvents.slice(0, liveMessageStartIndex),
    )
  })

  it('mirrors the live chat UI event sequence to Redis for gateway events', async () => {
    const harness = makePrewarmHarness()
    const liveEvents: Array<{ type: string; payload: Record<string, unknown> }> = []
    harness.openClaw.streamCompletion.mockImplementationOnce(
      async (input: {
        send: (type: string, payload: Record<string, unknown>) => Promise<void>
      }) => {
        await input.send('status', { phase: 'thinking', message: 'Planning next moves' })
        await input.send('tool_start', {
          name: 'ask_agent',
          label: 'Asking Ivy',
          tool_call_id: 'tool-1',
        })
        await input.send('thinking_delta', { delta: 'Reasoning', text: 'Reasoning' })
        await input.send('content_delta', { content: 'Hello' })
        await input.send('tool_update', {
          name: 'ask_agent',
          detail: 'Ivy is reviewing',
          tool_call_id: 'tool-1',
        })
        await input.send('tool_end', {
          name: 'ask_agent',
          label: 'Asking Ivy',
          status: 'completed',
          tool_call_id: 'tool-1',
        })
        await input.send('ui_block', { block: { type: 'chat_plan', title: 'Plan', items: [] } })
        return {
          content: 'Hello',
          toolSteps: [{ name: 'ask_agent', label: 'Asking Ivy', status: 'completed' }],
          completedGenerations: [],
          failed: undefined,
        }
      },
    )

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Current question',
      userId: 'user-1',
      accessToken: 'token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      model: 'google/gemini-3.5-flash',
      modelSettings: { reasoning_effort: 'none' },
      send: vi.fn(async (type: string, payload: Record<string, unknown>) => {
        liveEvents.push({ type, payload })
      }),
    })

    const storedEvents = harness.chatRunEvents.appendEvent.mock.calls.map(([input]) => ({
      type: input.type,
      payload: input.payload,
    }))
    const replayContractEvents = liveEvents.filter((event) => event.type !== 'credit_update')

    expect(storedEvents.map((event) => event.type)).toEqual(
      replayContractEvents.map((event) => event.type),
    )
    for (let i = 0; i < storedEvents.length; i++) {
      expect(
        normalizeLivePayloadForStored(replayContractEvents[i]!.payload, storedEvents[i]!.payload),
      ).toEqual(storedEvents[i]!.payload)
    }

    const finalMessageUpdate = harness.messages.update.mock.calls.at(-1)?.[2] as
      | { metadata?: Record<string, unknown> }
      | undefined
    const orderedBlocks = finalMessageUpdate?.metadata?.content_blocks_ordered as
      | Array<Record<string, unknown>>
      | undefined
    expect(orderedBlocks?.map((block) => block.type)).toEqual([
      'tool',
      'tool',
      'thinking_transcript',
      'text',
      'chat_plan',
    ])
    const thinkingBlock = orderedBlocks?.find((block) => block.type === 'thinking_transcript')
    const textBlock = orderedBlocks?.find((block) => block.type === 'text')
    const streamedToolBlock = orderedBlocks?.find((block) => block.name === 'ask_agent')
    const planBlock = orderedBlocks?.find((block) => block.type === 'chat_plan')
    expect(thinkingBlock).toMatchObject({
      type: 'thinking_transcript',
      content: 'Reasoning',
      state: 'active',
    })
    expect(textBlock).toMatchObject({ type: 'text', content: 'Hello' })
    expect(streamedToolBlock).toMatchObject({
      type: 'tool',
      name: 'ask_agent',
      state: 'complete',
      progress: [expect.objectContaining({ detail: 'Ivy is reviewing' })],
    })
    expect(planBlock).toMatchObject({ type: 'chat_plan', title: 'Plan' })
  })
})
