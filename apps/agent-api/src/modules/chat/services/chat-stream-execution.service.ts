import { Injectable, Logger } from '@nestjs/common'
import { isModelStrategy, resolveFallbackForStrategy, type ModelStrategy } from '@vibey/api-shared'
import {
  ChatModelInputService,
  type ChatModelSettings,
  type ValidatedModelSettings,
} from './chat-model-input.service'
import type { ChatRunCheckpointKind } from './chat-run-checkpoint.service'
import { ChatStreamRecoveryService } from './chat-stream-recovery.service'
import {
  OpenClawProxyService,
  type OpenClawCompletionResult,
  type OpenClawInputMessage,
  type OpenClawSkillCatalog,
  type SendFn,
  type TraceRecoveryEvent,
} from './openclaw-proxy.service'

const CONTINUATION_PROMPT =
  'Continue your previous response from exactly where you left off. Do not repeat prior text. Produce only the continuation.'

type RecordCheckpoint = (
  kind: ChatRunCheckpointKind,
  checkpoint: {
    summary: string
    remainingWork?: string | null
    lastCursor?: string | null
    toolCount?: number
    contentLength?: number
    contextWindowTokens?: number | null
    lastCallInputTokens?: number | null
    compactionCount?: number | null
    rawSnapshot?: Record<string, unknown>
  },
) => Promise<void>

export interface ChatStreamExecutionInput {
  chatDiag: string
  chatTimingLogsEnabled: boolean
  channel: 'telegram' | 'slack' | 'studio'
  conversationId: string
  campaignId?: string | null
  disabledNativeActions: string[]
  enabledToolkitsForGateway?: string[]
  gatewayAgentId: string
  gatewayModelId: string
  getAccumulatedContent: () => string
  identitySuffix?: string
  inputArray: OpenClawInputMessage[]
  instructions: string
  logChatFlow: (message: string) => void
  logger: Logger
  modelSettings?: ChatModelSettings
  openClawSkillCatalog?: OpenClawSkillCatalog
  progressiveSend: SendFn
  recordRunCheckpoint: RecordCheckpoint
  relaxedResponseFilter: boolean
  selectedModelInput: string | null
  selectedSettings: ValidatedModelSettings
  sessionKey: string
  signal?: AbortSignal
  traceId?: string | null
  messageId?: string | null
  runId?: string | null
  requestId?: string | null
  userContent: string
  userId: string
  orgId?: string | null
}

@Injectable()
export class ChatStreamExecutionService {
  constructor(
    private readonly openClaw: OpenClawProxyService,
    private readonly streamRecoveryService: ChatStreamRecoveryService,
    private readonly modelInputService: ChatModelInputService,
  ) {}

  async run(input: ChatStreamExecutionInput): Promise<OpenClawCompletionResult> {
    let result = await this.streamCompletion(input, input.inputArray, input.gatewayModelId)

    if (result.truncated && result.content.trim().length > 0) {
      result = await this.continueTruncatedResult(input, result)
    }

    if (
      result.failed === 'stream_stalled' &&
      result.content.length === 0 &&
      result.toolSteps.length === 0
    ) {
      result = await this.retryEmptyStall(input)
    }

    const hadEmptyResponse =
      !result.failed && result.content.length === 0 && result.toolSteps.length === 0
    if (hadEmptyResponse) {
      result = await this.retryEmptyOpenClone(input)
      if (!result.failed && result.content.length === 0 && result.toolSteps.length === 0) {
        result = {
          ...result,
          failed: 'empty_agent_response',
          recoveryEvents: (result.recoveryEvents ?? []).map((event) =>
            event.type === 'empty_response_retry'
              ? { ...event, status: 'failed' as const, reason: 'empty_agent_response' }
              : event,
          ),
        }
      }
    }

    if (
      result.failed &&
      this.streamRecoveryService.isRetryableProviderError(result.failed) &&
      isModelStrategy(input.selectedModelInput)
    ) {
      result = await this.retryFallbackModel(input, result.failed)
    }

    return result
  }

  private streamCompletion(
    input: ChatStreamExecutionInput,
    messages: OpenClawInputMessage[],
    model: string | undefined,
    modelSettings = input.selectedSettings.openClaw,
  ): Promise<OpenClawCompletionResult> {
    return this.openClaw.streamCompletion({
      input: messages,
      instructions: input.instructions,
      send: input.progressiveSend,
      model,
      agentId: input.gatewayAgentId,
      sessionKey: input.sessionKey,
      conversationId: input.conversationId,
      campaignId: input.campaignId,
      orgId: input.orgId,
      traceId: input.traceId,
      messageId: input.messageId,
      runId: input.runId,
      requestId: input.requestId,
      userId: input.userId,
      signal: input.signal,
      channel: input.channel,
      relaxedResponseFilter: input.relaxedResponseFilter,
      identitySuffix: input.identitySuffix,
      enabledToolkits: input.enabledToolkitsForGateway,
      disabledNativeActions: input.disabledNativeActions,
      skillCatalog: input.openClawSkillCatalog,
      modelSettings,
    })
  }

  private buildRecoveryEvent(
    type: string,
    status: TraceRecoveryEvent['status'],
    reason?: string,
    metadata?: Record<string, unknown>,
  ): TraceRecoveryEvent {
    return {
      type,
      status,
      ...(reason ? { reason: reason.slice(0, 500) } : {}),
      at: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    }
  }

  private async continueTruncatedResult(
    input: ChatStreamExecutionInput,
    result: OpenClawCompletionResult,
  ): Promise<OpenClawCompletionResult> {
    const continuationInput: OpenClawInputMessage[] = [
      {
        type: 'message',
        role: 'assistant',
        content: result.content,
      },
      {
        type: 'message',
        role: 'user',
        content: CONTINUATION_PROMPT,
      },
    ]
    const continuationResult = await this.streamCompletion(
      input,
      continuationInput,
      input.gatewayModelId || undefined,
    )
    const recoveryEvent = this.buildRecoveryEvent(
      'truncation_continuation',
      continuationResult.failed ? 'failed' : 'recovered',
      continuationResult.failed ?? 'truncated',
    )
    return {
      ...continuationResult,
      content: `${result.content}${continuationResult.content}`,
      toolSteps: [...result.toolSteps, ...continuationResult.toolSteps],
      usage: continuationResult.usage ?? result.usage,
      generationId: continuationResult.generationId ?? result.generationId,
      completedGenerations: [
        ...(result.completedGenerations ?? []),
        ...(continuationResult.completedGenerations ?? []),
      ],
      fullSystemPrompt: continuationResult.fullSystemPrompt ?? result.fullSystemPrompt,
      llmInput: continuationResult.llmInput ?? result.llmInput,
      llmOutput: continuationResult.llmOutput ?? result.llmOutput,
      recoveryEvents: [
        ...(result.recoveryEvents ?? []),
        recoveryEvent,
        ...(continuationResult.recoveryEvents ?? []),
      ],
    }
  }

  private async retryEmptyStall(
    input: ChatStreamExecutionInput,
  ): Promise<OpenClawCompletionResult> {
    if (input.chatTimingLogsEnabled) {
      input.logger.warn(
        `[ChatFlow] stall_retry ${input.chatDiag} model=${input.gatewayModelId ?? 'default'} reason=empty_stall`,
      )
    }
    await input.progressiveSend('status', {
      phase: 'thinking',
      message: 'Connection timed out — retrying',
    })
    const retryResult = await this.streamCompletion(input, input.inputArray, input.gatewayModelId)
    return {
      ...retryResult,
      recoveryEvents: [
        ...(retryResult.recoveryEvents ?? []),
        this.buildRecoveryEvent(
          'empty_stall_retry',
          retryResult.failed ? 'failed' : 'recovered',
          retryResult.failed ?? 'stream_stalled',
        ),
      ],
    }
  }

  private async retryEmptyOpenClone(
    input: ChatStreamExecutionInput,
  ): Promise<OpenClawCompletionResult> {
    if (input.chatTimingLogsEnabled) {
      input.logger.warn(
        `[ChatFlow] empty_response_retry ${input.chatDiag} model=${input.gatewayModelId ?? 'default'} reason=open_clone`,
      )
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 1500))
    await input.progressiveSend('status', { phase: 'thinking', message: 'Reconnecting...' })
    const retryResult = await this.streamCompletion(
      input,
      input.inputArray,
      input.gatewayModelId || undefined,
    )
    return {
      ...retryResult,
      recoveryEvents: [
        ...(retryResult.recoveryEvents ?? []),
        this.buildRecoveryEvent(
          'empty_response_retry',
          retryResult.failed ? 'failed' : 'recovered',
          retryResult.failed ?? 'empty_agent_response',
        ),
      ],
    }
  }

  private async retryFallbackModel(
    input: ChatStreamExecutionInput,
    failure: string,
  ): Promise<OpenClawCompletionResult> {
    const fallback = resolveFallbackForStrategy(input.selectedModelInput as ModelStrategy, 'chat')
    const fallbackSettings = await this.modelInputService.validateModelSettings(
      fallback.modelId,
      this.modelInputService.mergeResolvedModelSettings(fallback, input.modelSettings),
    )
    if (input.chatTimingLogsEnabled) {
      input.logger.warn(
        `[ChatFlow] fallback_retry ${input.chatDiag} fromModel=${input.gatewayModelId ?? 'default'} toModel=${fallback.modelId} reason=${failure}`,
      )
    }
    await input.progressiveSend('status', {
      phase: 'thinking',
      message: 'Primary model is busy, switching to fallback',
    })
    const retryResult = await this.streamCompletion(
      input,
      input.inputArray,
      fallback.modelId,
      fallbackSettings.openClaw,
    )
    return {
      ...retryResult,
      recoveryEvents: [
        ...(retryResult.recoveryEvents ?? []),
        this.buildRecoveryEvent(
          'fallback_model_retry',
          retryResult.failed ? 'failed' : 'recovered',
          failure,
          {
            from_model: input.gatewayModelId ?? null,
            to_model: fallback.modelId,
          },
        ),
      ],
    }
  }
}
