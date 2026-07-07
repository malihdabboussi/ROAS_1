import type { ContextBreakdown } from '@vibey/context-breakdown'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatTurnTerminalService } from './chat-turn-terminal.service'

const estimatedBreakdown: ContextBreakdown = {
  version: 1,
  source: 'estimate',
  generatedAt: 1,
  contextWindow: 128_000,
  totalTokens: 40,
  slices: [{ id: 'system', label: 'System', tokens: 40 }],
}

const finalBreakdown: ContextBreakdown = {
  ...estimatedBreakdown,
  source: 'run',
  generatedAt: 2,
  totalTokens: 50,
  slices: [{ id: 'conversation', label: 'Conversation', tokens: 50 }],
}

function buildService() {
  const streamService = {
    run: vi.fn().mockResolvedValue({
      toolSteps: [],
      resolvedModelId: 'anthropic/claude-opus-4.6',
      resultLastCallInputTokens: 50,
      effectiveContextWindowTokens: 128_000,
      contextBreakdown: finalBreakdown,
    }),
  }
  const completionService = {
    persistSuccessfulTurn: vi.fn().mockResolvedValue(undefined),
    emitSuccessfulTurnDone: vi.fn().mockResolvedValue(undefined),
    flushFinalMessage: vi.fn().mockResolvedValue(undefined),
    completeConversation: vi.fn().mockResolvedValue(undefined),
  }
  const contextAccounting = {
    buildEstimatedContextBreakdown: vi.fn().mockReturnValue(estimatedBreakdown),
  }
  const service = new ChatTurnTerminalService(
    streamService as never,
    completionService as never,
    { isRunCancelled: vi.fn() } as never,
    { failTrace: vi.fn() } as never,
    { complete: vi.fn(), clearAbortController: vi.fn() } as never,
    contextAccounting as never,
  )

  return { completionService, contextAccounting, service, streamService }
}

function buildInput(overrides: Record<string, unknown> = {}) {
  const sendRunEvent = vi.fn().mockResolvedValue(undefined)
  return {
    chatDiag: 'chat=test',
    chatTimingLogsEnabled: false,
    content: 'Hello',
    conversationId: 'conversation-1',
    dbOp: vi.fn(),
    defaultModelId: 'anthropic/claude-opus-4.6',
    disabledNativeActions: [],
    enabledToolkitsForGateway: [],
    gatewayModelId: 'anthropic/claude-opus-4.6',
    gatewayToolPolicySlice: null,
    history: [],
    inputArray: [{ type: 'message', role: 'user', content: 'Hello' }],
    instructions: 'SYSTEM',
    logChatFlow: vi.fn(),
    logChatTiming: vi.fn(),
    logger: { error: vi.fn(), warn: vi.fn() },
    measuredContextSlices: [],
    messageId: 'message-1',
    openClawSkillCatalog: undefined,
    orgId: 'org-1',
    resolvedAgentId: 'vibey',
    resolvedCampaignId: undefined,
    resolvedChannel: 'studio',
    resolvedSlashCommands: [],
    runId: 'run-1',
    requestId: 'request-1',
    runtime: { gatewayAgentId: 'vibey', agentKey: 'vibey' },
    selectedModelInput: null,
    selectedSettings: {
      request: { context_window_tokens: 128_000 },
      requestedModelId: 'anthropic/claude-opus-4.6',
      resolvedModelId: 'anthropic/claude-opus-4.6',
    },
    send: vi.fn().mockResolvedValue(undefined),
    sendRunEvent,
    sessionKey: 'session-1',
    streamMirrorService: { verify: vi.fn() },
    streamMirrorState: {},
    streamStartedAt: Date.now(),
    streamingState: {
      setModelStreamStartedAt: vi.fn(),
      getAccumulatedContent: vi.fn(() => 'Assistant reply'),
      getCompletedVisibleToolCount: vi.fn(() => 0),
      toolSteps: [],
      orderedBlocks: [],
      clearFlushTimer: vi.fn(),
      recordRunCheckpoint: vi.fn(),
      progressiveSend: vi.fn(),
    },
    traceId: null,
    recordTimingSpan: vi.fn(),
    getTimingSpans: vi.fn(() => []),
    userId: 'user-1',
    conversationMetadata: {},
    historyLength: 1,
    spaceId: null,
    hasActiveWorkingSetEntries: vi.fn(() => false),
    ...overrides,
  }
}

describe('ChatTurnTerminalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emits an early context_update before streaming the model response', async () => {
    const { contextAccounting, service, streamService } = buildService()
    const input = buildInput()

    await service.run(input as never)

    expect(contextAccounting.buildEstimatedContextBreakdown).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: 'SYSTEM',
        inputMessages: [{ type: 'message', role: 'user', content: 'Hello' }],
        contextWindowTokens: 128_000,
        modelId: 'anthropic/claude-opus-4.6',
      }),
    )
    expect(input.sendRunEvent).toHaveBeenCalledWith('context_update', {
      context_breakdown: estimatedBreakdown,
    })
    expect(input.sendRunEvent.mock.invocationCallOrder[0]).toBeLessThan(
      streamService.run.mock.invocationCallOrder[0],
    )
  })
})
