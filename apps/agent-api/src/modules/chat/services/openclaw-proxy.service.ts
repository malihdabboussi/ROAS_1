/**
 * OpenClaw Proxy Service (Layer 3 - Gateway Integration)
 *
 * Proxies chat requests to the user's OpenClaw gateway using the
 * Open Responses API (/v1/responses). The public facade is intentionally
 * stable; gateway request construction and SSE processing live in focused
 * collaborators in this module.
 */

import { Injectable, Logger } from '@nestjs/common'
import { ErrorReporter } from '@vibey/api-shared'
import { isChatTimingLogsEnabled } from '../../../lib/debug/chat-timing-logs'
import { AnthropicClaudeAdminAuthService } from './anthropic-claude-admin-auth.service'
import { OpenAICodexAdminAuthService } from './openai-codex-admin-auth.service'
import {
  resolveGatewayModel,
  type ModelReasoningEffort,
  type ModelReasoningTransport,
  type OpenClawModelSettings,
} from './openclaw-model-routing'
import { OpenClawGatewayRequestService } from './openclaw-gateway-request.service'
import type { OpenClawCompletionResult, ProxyOptions } from './openclaw-proxy.types'
import { OpenClawStreamReaderService } from './openclaw-stream-reader.service'
import { ResponseFilterService } from './response-filter.service'

export { resolveGatewayModel } from './openclaw-model-routing'
export type {
  ModelReasoningEffort,
  ModelReasoningTransport,
  OpenClawModelSettings,
} from './openclaw-model-routing'
export type {
  CompletedGeneration,
  OpenClawCompletionResult,
  OpenClawInputContentPart,
  OpenClawInputMessage,
  OpenClawSkillCatalog,
  ProviderBillingStartedEvent,
  ProxyOptions,
  SendFn,
  SystemPromptReport,
  TraceRecoveryEvent,
  TraceRecoveryStatus,
  TraceTerminalStatus,
  TraceUserVisibleOutcome,
  ToolStep,
} from './openclaw-proxy.types'

@Injectable()
export class OpenClawProxyService {
  private readonly logger = new Logger(OpenClawProxyService.name)
  private readonly REQUEST_TIMEOUT_MS = 600_000

  constructor(
    responseFilter: ResponseFilterService,
    errorReporter: ErrorReporter,
    anthropicClaudeAdminAuth: AnthropicClaudeAdminAuthService,
    openAICodexAdminAuth: OpenAICodexAdminAuthService,
    private readonly gatewayRequest: OpenClawGatewayRequestService = new OpenClawGatewayRequestService(
      errorReporter,
      anthropicClaudeAdminAuth,
      openAICodexAdminAuth,
    ),
    private readonly streamReader: OpenClawStreamReaderService = new OpenClawStreamReaderService(
      responseFilter,
      errorReporter,
    ),
  ) {}

  private get agentId(): string {
    return 'vibey'
  }

  async streamCompletion(options: ProxyOptions): Promise<OpenClawCompletionResult> {
    const agentId = options.agentId || this.agentId
    const correlation = `conversationId=${options.conversationId ?? 'unknown'} userId=${options.userId ?? 'unknown'} sessionKey=${options.sessionKey ?? 'none'} agentId=${agentId}`
    const streamTimingLogsEnabled = isChatTimingLogsEnabled()
    if (streamTimingLogsEnabled) {
      this.logger.log(
        `[Chat] start ${correlation} inputItems=${options.input.length} model=${options.model ?? 'default'} stateless=true`,
      )
    }

    const resolvedModel = resolveGatewayModel(options.model, agentId)
    const timingStartedAt = Date.now()
    const logStreamTiming = (stage: string, extra?: Record<string, unknown>): void => {
      if (!streamTimingLogsEnabled) return
      this.logger.log(
        JSON.stringify({
          feature: 'openclaw_stream_timing_v1',
          stage,
          latency_ms: Date.now() - timingStartedAt,
          conversation_id: options.conversationId ?? null,
          user_id: options.userId ?? null,
          agent_id: agentId,
          session_key_present: Boolean(options.sessionKey),
          input_items: options.input.length,
          requested_model: options.model ?? null,
          resolved_model: resolvedModel,
          ...(extra ?? {}),
        }),
      )
    }
    logStreamTiming('start')

    const { response, timeoutHandle } = await this.gatewayRequest.openGatewayStream({
      agentId,
      instructions: options.instructions,
      logger: this.logger,
      logStreamTiming,
      options,
      requestTimeoutMs: this.REQUEST_TIMEOUT_MS,
      resolvedModel,
      streamTimingLogsEnabled,
    })

    return this.streamReader.readGatewayResponse({
      agentId,
      correlation,
      logger: this.logger,
      logStreamTiming,
      options,
      response,
      resolvedModel,
      streamTimingLogsEnabled,
      timeoutHandle,
    })
  }
}
