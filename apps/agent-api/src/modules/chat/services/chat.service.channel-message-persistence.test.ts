import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatService } from './chat.service'

function makeQuery(result: unknown) {
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

function makeChatRunEventsMock() {
  return {
    getActiveRunForConversation: vi.fn(async () => null),
    startRun: vi.fn(async () => undefined),
    appendEvent: vi.fn(async () => null),
    markRunDone: vi.fn(async () => undefined),
    markRunFailed: vi.fn(async () => undefined),
    markRunRecoverableFailed: vi.fn(async () => undefined),
    recordRunRouting: vi.fn(async () => undefined),
  }
}

function makeHarness() {
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'agents_registry') {
        return makeQuery({
          config: { model_id: 'google/gemini-3.5-flash' },
          is_active: true,
        })
      }
      if (table === 'llm_model_capabilities') {
        return makeQuery({
          capability_profile: {
            reasoning: { transport: 'reasoning.effort', levels: ['none', 'low'] },
            context: { tiers: [{ tokens: 65_536, label: '65k' }] },
            speed: { available: true, fastModelId: 'google/gemini-3.5-flash' },
          },
        })
      }
      return makeQuery(null)
    }),
  }
  const createdMessages: Array<Record<string, unknown>> = []
  const updatedMessages: Array<{ id: string; updates: Record<string, unknown> }> = []
  const messages = {
    create: vi.fn(async (_s, record: Record<string, unknown>) => {
      createdMessages.push(record)
    }),
    update: vi.fn(async (_s, id: string, updates: Record<string, unknown>) => {
      updatedMessages.push({ id, updates })
    }),
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
    streamCompletion: vi.fn(async ({ send }) => {
      await send('content_delta', { content: 'Telegram answer' })
      return {
        content: 'Telegram answer',
        toolSteps: [],
        completedGenerations: [],
        failed: undefined,
      }
    }),
  }
  const requestContext = {
    set: vi.fn(),
    clear: vi.fn(),
    drainAgentCheckpointMutations: vi.fn(() => []),
    getActiveWorkingSet: vi.fn(() => ({ byType: {}, lastTouched: null })),
    replaceActiveWorkingSet: vi.fn(),
    setActiveArtifact: vi.fn(),
  }
  const agentPolicy = {
    resolveAgentPolicy: vi.fn(async () => ({
      effective: new Set(['campaign_context:*', 'brain_access:personal']),
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      teamId: null,
    })),
    canExecuteAction: vi.fn(async () => ({ allowed: true })),
    canAgentUseCapability: vi.fn(async () => true),
  }
  const chatRunEvents = makeChatRunEventsMock()
  const service = new ChatService(
    messages as any,
    conversations as any,
    openClaw as any,
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
      buildFullContext: vi.fn(async () => 'AGENT BRAIN CONTEXT'),
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
    chatRunEvents as any,
    requestContext as any,
    { getForChannel: vi.fn(() => '') } as any,
    { buildThemeSummary: vi.fn(async () => 'THEME CONTEXT') } as any,
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
    { buildIntegrationContext: vi.fn(async () => '') } as any,
    { resolveEffectiveLevel: vi.fn() } as any,
    { finalizeTurn: vi.fn() } as any,
    { recordCompletion: vi.fn(async () => undefined) } as any,
    agentPolicy as any,
  )

  return {
    service,
    supabase,
    messages,
    conversations,
    openClaw,
    requestContext,
    agentPolicy,
    chatRunEvents,
    createdMessages,
    updatedMessages,
  }
}

describe('ChatService Telegram channel message persistence', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('creates the Telegram user message, streams assistant placeholder, and saves final content', async () => {
    const harness = makeHarness()
    const send = vi.fn(async () => undefined)

    await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Telegram customer asks',
      userId: 'user-1',
      accessToken: 'access-token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      source: 'telegram',
      channelUser: {
        platform_id: '555',
        username: 'brian',
        display_name: 'Brian Bell',
        language: 'en',
      },
      send,
    })

    expect(harness.messages.create).toHaveBeenCalledWith(
      harness.supabase,
      expect.objectContaining({
        conversation_id: 'conversation-1',
        role: 'user',
        content: 'Telegram customer asks',
      }),
    )
    expect(harness.messages.create).toHaveBeenCalledWith(
      harness.supabase,
      expect.objectContaining({
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: '',
      }),
    )
    expect(harness.updatedMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          updates: expect.objectContaining({ content: 'Telegram answer' }),
        }),
      ]),
    )
    expect(harness.requestContext.set).toHaveBeenCalledWith(
      'conversation-1',
      'user-1',
      'campaign-1',
      'access-token',
      null,
      expect.any(String),
      'org-1',
      'telegram',
      {
        platform_id: '555',
        display_name: 'Brian Bell',
        username: 'brian',
      },
      null,
      'unknown',
      expect.any(String),
      [],
    )
    expect(harness.openClaw.streamCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        userId: 'user-1',
        channel: 'telegram',
      }),
    )
    expect(send).toHaveBeenCalledWith('content_delta', { content: 'Telegram answer' })
    expect(send).toHaveBeenCalledWith(
      'done',
      expect.objectContaining({
        message_id: expect.any(String),
      }),
    )
  })

  it('does not emit done or duration metadata after a failed OpenClaw result', async () => {
    const harness = makeHarness()
    const send = vi.fn(async () => undefined)
    harness.openClaw.streamCompletion.mockResolvedValueOnce({
      content: '',
      toolSteps: [],
      completedGenerations: [],
      failed: 'empty_agent_response',
    })

    const result = await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Telegram customer asks',
      userId: 'user-1',
      accessToken: 'access-token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      source: 'telegram',
      send,
    })

    expect(result.status).toBe('failed')
    expect(send).toHaveBeenCalledWith('error', { code: 'no_answer' })
    expect(send).not.toHaveBeenCalledWith('done', expect.anything())
    expect(harness.chatRunEvents.markRunDone).not.toHaveBeenCalled()
    expect(harness.chatRunEvents.markRunFailed).toHaveBeenCalledWith(
      expect.any(String),
      'empty_agent_response',
    )
    const finalUpdate = harness.updatedMessages.at(-1)?.updates
    expect((finalUpdate?.metadata as Record<string, unknown>)?.duration_ms).toBeUndefined()
  })

  it('marks context overflow as recoverable and still emits no done', async () => {
    const harness = makeHarness()
    const send = vi.fn(async () => undefined)
    harness.openClaw.streamCompletion.mockResolvedValueOnce({
      content: '',
      toolSteps: [],
      completedGenerations: [],
      failed: 'context_window_exceeded: input is too long',
      truncated: true,
      lastCallInputTokens: 128000,
      contextWindowTokens: 128000,
    })

    const result = await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Telegram customer asks',
      userId: 'user-1',
      accessToken: 'access-token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      source: 'telegram',
      send,
    })

    expect(result.status).toBe('failed_recoverable')
    expect(send).toHaveBeenCalledWith('status', {
      phase: 'compacting',
      message: 'Summarizing the work so far',
    })
    expect(send).toHaveBeenCalledWith('error', { code: 'context_window_exceeded' })
    expect(send).not.toHaveBeenCalledWith('done', expect.anything())
    expect(harness.chatRunEvents.markRunRecoverableFailed).toHaveBeenCalledWith(
      expect.any(String),
      'context_window_exceeded: input is too long',
    )
  })

  it('completes recovered OpenClaw context overflow without API-level retry', async () => {
    const harness = makeHarness()
    const send = vi.fn(async () => undefined)
    harness.openClaw.streamCompletion.mockImplementationOnce(async ({ send: streamSend }) => {
      await streamSend('status', {
        phase: 'compacting',
        message: 'Summarizing the work so far',
      })
      await streamSend('content_delta', { content: 'Recovered answer' })
      return {
        content: 'Recovered answer',
        toolSteps: [],
        completedGenerations: [],
        failed: undefined,
        compactionCount: 1,
        recoveryEvents: [
          {
            type: 'context_window_compaction',
            status: 'recovered',
            reason: 'compacted',
          },
        ],
      }
    })

    const result = await harness.service.processMessage({
      supabase: harness.supabase as any,
      conversationId: 'conversation-1',
      content: 'Telegram customer asks',
      userId: 'user-1',
      accessToken: 'access-token',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      source: 'telegram',
      send,
    })

    expect(result.status).toBe('done')
    expect(harness.openClaw.streamCompletion).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith('status', {
      phase: 'compacting',
      message: 'Summarizing the work so far',
    })
    expect(send).toHaveBeenCalledWith('content_delta', { content: 'Recovered answer' })
    expect(send).not.toHaveBeenCalledWith('error', expect.anything())
    expect(send).toHaveBeenCalledWith(
      'done',
      expect.objectContaining({
        message_id: expect.any(String),
      }),
    )
  })
})
