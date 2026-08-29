import { vi } from 'vitest'
import { ChatModelInputService } from './chat-model-input.service'
import { ChatStreamExecutionService } from './chat-stream-execution.service'
import { ChatStreamRecoveryService } from './chat-stream-recovery.service'

export function makeChatStreamExecutionService(input?: {
  streamCompletion?: ReturnType<typeof vi.fn>
  recovery?: ChatStreamRecoveryService
  validateModelSettings?: ReturnType<typeof vi.fn>
  executeAction?: ReturnType<typeof vi.fn>
  resolveCampaignIdByNameForContext?: ReturnType<typeof vi.fn>
}) {
  const openClaw = {
    streamCompletion:
      input?.streamCompletion ??
      vi.fn(async () => ({
        content: 'ok',
        toolSteps: [],
      })),
  }
  const executeAction =
    input?.executeAction ??
    vi.fn(async (action: string) =>
      action === 'list_tasks'
        ? { tasks: [{ id: 'task-1', title: 'Assigned task' }], total_count: 1 }
        : { events: [{ id: 'event-1', title: 'Today meeting' }] },
    )
  return new ChatStreamExecutionService(
    openClaw as any,
    input?.recovery ?? new ChatStreamRecoveryService(),
    {
      mergeResolvedModelSettings: vi.fn((resolved) => resolved.modelSettings),
      validateModelSettings:
        input?.validateModelSettings ??
        vi.fn(async (modelId, settings) => ({
          requestedModelId: modelId,
          resolvedModelId: modelId,
          request: {},
          openClaw: {
            contextWindowTokens: settings?.context_window_tokens,
            reasoningEffort: settings?.reasoning_effort,
          },
        })),
    } as unknown as ChatModelInputService,
    {
      get: vi.fn(() => ({
        executeAction,
        resolveCampaignIdByNameForContext:
          input?.resolveCampaignIdByNameForContext ?? vi.fn(async () => 'campaign-1'),
      })),
    } as any,
  )
}

export function makeChatStreamExecutionInput(overrides: Record<string, unknown> = {}) {
  return {
    chatDiag: 'test',
    chatTimingLogsEnabled: false,
    channel: 'studio' as const,
    conversationId: 'conversation-1',
    disabledNativeActions: [],
    gatewayAgentId: 'vibey',
    gatewayModelId: 'anthropic/claude-sonnet-4.6',
    getAccumulatedContent: () => '',
    inputArray: [{ type: 'message', role: 'user', content: 'Hi' }],
    instructions: 'Answer the user.',
    logChatFlow: vi.fn(),
    logger: { warn: vi.fn() },
    progressiveSend: vi.fn(async () => undefined),
    recordRunCheckpoint: vi.fn(async () => undefined),
    relaxedResponseFilter: false,
    selectedModelInput: null,
    selectedSettings: {
      requestedModelId: 'anthropic/claude-sonnet-4.6',
      resolvedModelId: 'anthropic/claude-sonnet-4.6',
      request: {},
      openClaw: {},
    },
    sessionKey: 'session-1',
    userContent: 'Hi',
    userId: 'user-1',
    ...overrides,
  }
}
